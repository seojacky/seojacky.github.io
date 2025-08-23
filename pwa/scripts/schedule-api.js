// schedule-api.js - Спеціалізований API для роботи з розкладом занять

import { config } from './config-loader.js';

export class ScheduleAPI {
    constructor() {
        this.isInitialized = false;
        this.errorHandling = null;
        this.lessonTypes = null;
        this.periods = null;
        this.messages = null;
    }

    // Ініціалізація API
    async init() {
        if (this.isInitialized) return;
        
        try {
            this.errorHandling = await config.getErrorHandling();
            this.lessonTypes = await config.getLessonTypes();
            this.periods = await config.getClassSchedulePeriods();
            this.messages = await config.getMessages();
            
            this.isInitialized = true;
            console.log('ScheduleAPI ініціалізовано');
        } catch (error) {
            console.error('Помилка ініціалізації ScheduleAPI:', error);
            throw error;
        }
    }

    // === ОСНОВНІ МЕТОДИ ОТРИМАННЯ РОЗКЛАДУ ===

    // Отримання розкладу на один день
    async getScheduleForDay(settings, date, options = {}) {
        try {
            await this.ensureInitialized();
            
            console.log(`Завантаження розкладу на ${date} для:`, settings);

            let scheduleData;
            
            if (settings.userRole === 'student') {
                scheduleData = await config.getGroupSchedule(settings.selectedId, date, options);
            } else if (settings.userRole === 'teacher') {
                scheduleData = await config.getInstructorSchedule(settings.selectedId, date, options);
            } else {
                throw new Error('Невідома роль користувача');
            }

            // Валідуємо та форматуємо дані
            const validatedData = this.validateScheduleData(scheduleData);
            const formattedData = await this.formatScheduleForDisplay(validatedData, settings);

            console.log('Розклад успішно завантажено:', formattedData);
            return formattedData;

        } catch (error) {
            console.error('Помилка завантаження денного розкладу:', error);
            
            // Можливість fallback на кешовані дані
            if (this.errorHandling.fallbackToCache) {
                const fallbackData = await this.tryFallbackToCache(settings, date);
                if (fallbackData) {
                    return fallbackData;
                }
            }
            
            throw this.createScheduleError('day', error);
        }
    }

    // Отримання розкладу на тиждень (понеділок-п'ятниця)
    async getScheduleForWeek(settings, startDate, options = {}) {
        try {
            await this.ensureInitialized();
            
            const weekDates = this.getWeekDates(startDate);
            console.log(`Завантаження тижневого розкладу з ${weekDates[0]} по ${weekDates[4]}`);

            // Паралельні запити для всіх днів тижня
            const schedulePromises = weekDates.map(date => 
                this.getScheduleForDay(settings, date, { ...options, suppressErrors: true })
                    .catch(error => {
                        console.warn(`Помилка завантаження розкладу на ${date}:`, error);
                        return null; // Повертаємо null для неуспішних днів
                    })
            );

            const weekSchedules = await Promise.all(schedulePromises);
            
            // Перевіряємо скільки днів завантажилось успішно
            const successfulDays = weekSchedules.filter(day => day !== null).length;
            
            if (successfulDays === 0) {
                throw new Error('Не вдалося завантажити розклад жодного дня');
            }

            if (successfulDays < 5) {
                console.warn(`Завантажено лише ${successfulDays} з 5 днів тижня`);
            }

            const weekData = {
                startDate: weekDates[0],
                endDate: weekDates[4],
                dates: weekDates,
                schedules: weekSchedules,
                successfulDays: successfulDays,
                settings: settings
            };

            console.log(`Тижневий розклад завантажено: ${successfulDays}/5 днів`);
            return weekData;

        } catch (error) {
            console.error('Помилка завантаження тижневого розкладу:', error);
            throw this.createScheduleError('week', error);
        }
    }

    // Отримання розкладу за діапазон дат
    async getScheduleForDateRange(settings, startDate, endDate, options = {}) {
        try {
            await this.ensureInitialized();
            
            const dates = this.getDateRange(startDate, endDate);
            console.log(`Завантаження розкладу за період: ${dates.length} днів`);

            if (dates.length > 14) {
                console.warn('Завантаження розкладу за період більше 14 днів може зайняти багато часу');
            }

            const schedulePromises = dates.map(date => 
                this.getScheduleForDay(settings, date, { ...options, suppressErrors: true })
                    .catch(error => {
                        console.warn(`Помилка завантаження розкладу на ${date}:`, error);
                        return null;
                    })
            );

            const rangeSchedules = await Promise.all(schedulePromises);
            const successfulDays = rangeSchedules.filter(day => day !== null).length;

            return {
                startDate,
                endDate,
                dates,
                schedules: rangeSchedules,
                successfulDays,
                totalDays: dates.length,
                settings
            };

        } catch (error) {
            console.error('Помилка завантаження розкладу за період:', error);
            throw this.createScheduleError('range', error);
        }
    }

    // === ДОПОМІЖНІ МЕТОДИ ===

    // Отримання дат тижня (понеділок-п'ятниця)
    getWeekDates(date) {
        const currentDate = new Date(date);
        const dayOfWeek = currentDate.getDay();
        const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(currentDate.setDate(diff));
        
        const weekDates = [];
        for (let i = 0; i < 5; i++) { // Понеділок-П'ятниця
            const day = new Date(monday);
            day.setDate(monday.getDate() + i);
            weekDates.push(config.formatDateForAPI(day));
        }
        
        return weekDates;
    }

    // Отримання діапазону дат
    getDateRange(startDate, endDate) {
        const dates = [];
        const current = new Date(startDate);
        const end = new Date(endDate);
        
        while (current <= end) {
            // Включаємо тільки робочі дні (понеділок-п'ятниця)
            const dayOfWeek = current.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                dates.push(config.formatDateForAPI(current));
            }
            current.setDate(current.getDate() + 1);
        }
        
        return dates;
    }

    // Валідація даних розкладу
    validateScheduleData(data) {
        if (!data) {
            throw new Error('Отримано порожні дані розкладу');
        }

        // Базова структура відповіді API
        const validated = {
            group: data.group || null,
            instructor: data.instructor || null,
            day: data.day || null,
            date: data.date || null,
            schedule: data.schedule || {}
        };

        // Валідуємо структуру розкладу
        if (typeof validated.schedule !== 'object') {
            console.warn('Неочікувана структура розкладу:', validated.schedule);
            validated.schedule = {};
        }

        // Валідуємо кожну пару
        Object.keys(validated.schedule).forEach(lessonNumber => {
            const lesson = validated.schedule[lessonNumber];
            if (lesson && typeof lesson === 'object') {
                validated.schedule[lessonNumber] = {
                    title: lesson.title || lesson.subject || 'Предмет не вказано',
                    type: lesson.type || 'Тип не вказано',
                    instructorName: lesson.instructorName || lesson.teacher || null,
                    group: lesson.group || null,
                    room: lesson.room || lesson.classroom || null,
                    building: lesson.building || null,
                    weeks: lesson.weeks || null,
                    evenOrOdd: lesson.evenOrOdd || null,
                    notes: lesson.notes || null
                };
            }
        });

        return validated;
    }

    // Форматування розкладу для відображення
    async formatScheduleForDisplay(data, settings) {
        const formatted = {
            ...data,
            displayTitle: '',
            formattedDate: '',
            isEmpty: Object.keys(data.schedule || {}).length === 0,
            lessonsCount: Object.keys(data.schedule || {}).length
        };

        // Формуємо заголовок
        if (settings.userRole === 'student') {
            formatted.displayTitle = `${settings.displayName || 'Група'}`;
        } else if (settings.userRole === 'teacher') {
            formatted.displayTitle = `${settings.displayName || 'Викладач'}`;
        }

        // Форматуємо дату
        if (data.date) {
            try {
                formatted.formattedDate = await config.formatDateForDisplay(data.date);
            } catch (error) {
                console.warn('Помилка форматування дати:', error);
                formatted.formattedDate = data.date;
            }
        }

        // Додаємо інформацію про типи занять
        Object.keys(formatted.schedule).forEach(lessonNumber => {
            const lesson = formatted.schedule[lessonNumber];
            const lessonType = this.lessonTypes[lesson.type?.toLowerCase()] || this.lessonTypes['practice'];
            
            if (lessonType) {
                lesson.typeInfo = {
                    name: lessonType.name,
                    shortName: lessonType.shortName,
                    color: lessonType.color,
                    icon: lessonType.icon
                };
            }
        });

        return formatted;
    }

    // Спроба fallback на кешовані дані
    async tryFallbackToCache(settings, date) {
        try {
            const cacheKey = `${settings.userRole}_${settings.selectedId}_${date}`;
            const cached = await config.getCacheData('schedule', cacheKey);
            
            if (cached) {
                console.warn('Використовуємо кешовані дані через помилку API');
                return cached;
            }
        } catch (error) {
            console.warn('Помилка отримання кешованих даних:', error);
        }
        
        return null;
    }

    // === МЕТОДИ ОБРОБКИ ПОМИЛОК ===

    // Створення помилки розкладу
    createScheduleError(type, originalError) {
        const errorMessages = {
            day: 'Не вдалося завантажити розклад на день',
            week: 'Не вдалося завантажити тижневий розклад', 
            range: 'Не вдалося завантажити розклад за період'
        };

        const error = new Error(errorMessages[type] || 'Помилка завантаження розкладу');
        error.originalError = originalError;
        error.type = type;
        
        // Додаємо додаткові деталі якщо дозволено
        if (this.errorHandling?.showDetails) {
            error.details = originalError.message;
        }
        
        return error;
    }

    // === СЛУЖБОВІ МЕТОДИ ===

    // Перевірка ініціалізації
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.init();
        }
    }

    // Отримання статистики кешу
    async getCacheStats() {
        const stats = {
            localStorage: 0,
            sessionStorage: 0,
            scheduleItems: 0,
            totalSize: 0
        };

        try {
            // Рахуємо елементи localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('kntu_')) {
                    stats.localStorage++;
                    if (key.includes('schedule')) {
                        stats.scheduleItems++;
                    }
                    const item = localStorage.getItem(key);
                    stats.totalSize += item ? item.length : 0;
                }
            }

            // Рахуємо елементи sessionStorage
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith('kntu_')) {
                    stats.sessionStorage++;
                    if (key.includes('schedule')) {
                        stats.scheduleItems++;
                    }
                    const item = sessionStorage.getItem(key);
                    stats.totalSize += item ? item.length : 0;
                }
            }

            stats.totalSizeKB = Math.round(stats.totalSize / 1024);

        } catch (error) {
            console.warn('Помилка отримання статистики кешу:', error);
        }

        return stats;
    }

    // Очищення кешу розкладу
    async clearScheduleCache() {
        try {
            await config.clearCache('schedule');
            console.log('Кеш розкладу очищено');
        } catch (error) {
            console.error('Помилка очищення кешу розкладу:', error);
        }
    }

    // === МЕТОДИ ДЛЯ UI ІНТЕГРАЦІЇ ===

    // Отримання порожнього об'єкта розкладу
    getEmptyScheduleData(settings, date) {
        return {
            group: settings.userRole === 'student' ? settings.displayName : null,
            instructor: settings.userRole === 'teacher' ? settings.displayName : null,
            day: null,
            date: date,
            schedule: {},
            displayTitle: settings.displayName || '',
            formattedDate: date,
            isEmpty: true,
            lessonsCount: 0
        };
    }

    // Перевірка чи є дані в розкладі
    hasScheduleData(scheduleData) {
        return scheduleData && 
               scheduleData.schedule && 
               Object.keys(scheduleData.schedule).length > 0;
    }

    // Отримання всіх пар з розкладу (для тижневого вигляду)
    getAllLessonsFromWeek(weekData) {
        const allLessons = {};
        
        if (!weekData.schedules) return allLessons;
        
        weekData.schedules.forEach((daySchedule, dayIndex) => {
            if (daySchedule && daySchedule.schedule) {
                Object.keys(daySchedule.schedule).forEach(lessonNumber => {
                    if (!allLessons[lessonNumber]) {
                        allLessons[lessonNumber] = {};
                    }
                    allLessons[lessonNumber][dayIndex] = daySchedule.schedule[lessonNumber];
                });
            }
        });
        
        return allLessons;
    }
}

// Експортуємо єдиний екземпляр
export const scheduleAPI = new ScheduleAPI();