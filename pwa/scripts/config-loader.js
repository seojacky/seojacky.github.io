// config-loader.js - Адаптована версія для PWA з розширення єХНТУ

class ConfigLoader {
    constructor() {
        this.config = null;
        this.universityCode = 'kntu';
    }

    // Завантаження конфігурації
    async loadConfig() {
        if (this.config) {
            return this.config; // Кешована версія
        }

        try {
            const configModule = await import(`/pwa/settings/universities/${this.universityCode}/config.js`);
            this.config = configModule.default;
            console.log('Конфігурація успішно завантажена:', this.config.university.name);
            return this.config;
        } catch (error) {
            console.error('Помилка завантаження конфігурації:', error);
            return this.getDefaultConfig();
        }
    }

    // Базова конфігурація як fallback
    getDefaultConfig() {
        return {
            university: {
                code: 'kntu',
                name: 'Херсонський національний технічний університет',
                shortName: 'ХНТУ',
                timeZone: 'Europe/Kiev'
            },
            schedule: {
                bellSchedule: [
                    { number: 1, start: "08:30", end: "09:50", duration: 80, breakAfter: 15 },
                    { number: 2, start: "10:05", end: "11:25", duration: 80, breakAfter: 15 },
                    { number: 3, start: "11:40", end: "13:00", duration: 80, breakAfter: 15 },
                    { number: 4, start: "13:15", end: "14:35", duration: 80, breakAfter: 15 },
                    { number: 5, start: "14:50", end: "16:10", duration: 80, breakAfter: 15 },
                    { number: 6, start: "16:25", end: "17:45", duration: 80, breakAfter: 15 },
                    { number: 7, start: "18:00", end: "19:20", duration: 80, breakAfter: 0 }
                ],
                academicYear: {
                    startDate: "2024-09-02",
                    endDate: "2025-06-30"
                }
            },
            api: {
                baseUrl: "http://91.199.45.91:8080/api",
                endpoints: {
                    faculties: "/faculties/get-all",
                    groups: "/groups/get-all-by-id-faculty",
                    cafedras: "/cafedras/get-all-by-id-faculty",
                    instructors: "/instructors/get-all-by-cafedra",
                    scheduleGroup: "/schedule/group/get-all-by-day",
                    scheduleInstructor: "/schedule/instructor/get-all-by-day"
                }
            }
        };
    }

    // === ІСНУЮЧІ МЕТОДИ (БЕЗ ЗМІН) ===

    // Отримання розкладу дзвінків
    async getBellSchedule() {
        const config = await this.loadConfig();
        return config.schedule?.bellSchedule || [];
    }

    // Отримання дати початку навчального року
    async getAcademicYearStart() {
        const config = await this.loadConfig();
        const startDate = config.schedule?.academicYear?.startDate;
        
        if (!startDate) {
            throw new Error('Початкова дата навчального року не задана в конфігурації');
        }
        
        return startDate;
    }

    // Отримання часового поясу
    async getTimeZone() {
        const config = await this.loadConfig();
        return config.university?.timeZone || 'Europe/Kiev';
    }

    // Конвертація часу в хвилини (з розширення)
    timeStringToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    // Отримання інформації про університет
    async getUniversityInfo() {
        const config = await this.loadConfig();
        return config.university;
    }

    // Перевірка чи сьогодні робочий день (спрощена версія)
    async isWorkingDay(date = new Date()) {
        // Понеділок-П'ятниця (1-5)
        const dayOfWeek = date.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5;
    }

    // Оновлення конфігурації (скидання кешу)
    reloadConfig() {
        this.config = null;
        return this.loadConfig();
    }

    // === НОВІ МЕТОДИ ДЛЯ API РОЗКЛАДУ ЗАНЯТЬ ===

    // Отримання API конфігурації
    async getAPIConfig() {
        const config = await this.loadConfig();
        return config.api || this.getDefaultConfig().api;
    }

    // Отримання базової URL API
    async getAPIBaseUrl() {
        const apiConfig = await this.getAPIConfig();
        return apiConfig.baseUrl;
    }

    // Отримання endpoints
    async getAPIEndpoints() {
        const apiConfig = await this.getAPIConfig();
        return apiConfig.endpoints || {};
    }

    // Отримання повної URL для endpoint
    async getFullAPIUrl(endpointName) {
        const baseUrl = await this.getAPIBaseUrl();
        const endpoints = await this.getAPIEndpoints();
        const endpoint = endpoints[endpointName];
        
        if (!endpoint) {
            throw new Error(`Endpoint '${endpointName}' не знайдено в конфігурації`);
        }
        
        return baseUrl + endpoint;
    }

    // === МЕТОДИ КЕШУВАННЯ ===

    // Отримання стратегії кешування для типу даних
    async getCacheStrategy(dataType) {
        const config = await this.loadConfig();
        const strategies = config.caching?.strategies;
        
        if (strategies && strategies[dataType]) {
            return strategies[dataType];
        }
        
        // Default стратегія
        return {
            storage: 'sessionStorage',
            duration: 60 * 60 * 1000, // 1 година
            prefix: `kntu_${dataType}`
        };
    }

    // Збереження даних в кеш
    async setCacheData(dataType, key, data) {
        try {
            const strategy = await this.getCacheStrategy(dataType);
            const cacheKey = `${strategy.prefix}_${key}`;
            const cacheData = {
                data: data,
                timestamp: Date.now(),
                expires: Date.now() + strategy.duration
            };

            const storage = strategy.storage === 'localStorage' ? localStorage : sessionStorage;
            storage.setItem(cacheKey, JSON.stringify(cacheData));
            
            console.log(`Дані збережено в кеш: ${cacheKey}`);
        } catch (error) {
            console.warn('Помилка збереження в кеш:', error);
        }
    }

    // Отримання даних з кешу
    async getCacheData(dataType, key) {
        try {
            const strategy = await this.getCacheStrategy(dataType);
            const cacheKey = `${strategy.prefix}_${key}`;
            const storage = strategy.storage === 'localStorage' ? localStorage : sessionStorage;
            
            const cached = storage.getItem(cacheKey);
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            
            // Перевіряємо чи не застарів кеш
            if (Date.now() > cacheData.expires) {
                storage.removeItem(cacheKey);
                console.log(`Кеш застарів і видалений: ${cacheKey}`);
                return null;
            }

            console.log(`Дані отримано з кешу: ${cacheKey}`);
            return cacheData.data;
            
        } catch (error) {
            console.warn('Помилка читання кешу:', error);
            return null;
        }
    }

    // Очищення кешу
    async clearCache(dataType = null) {
        try {
            const storages = [localStorage, sessionStorage];
            
            storages.forEach(storage => {
                const keysToRemove = [];
                
                for (let i = 0; i < storage.length; i++) {
                    const key = storage.key(i);
                    if (key && key.startsWith('kntu_')) {
                        if (!dataType || key.startsWith(`kntu_${dataType}_`)) {
                            keysToRemove.push(key);
                        }
                    }
                }
                
                keysToRemove.forEach(key => {
                    storage.removeItem(key);
                    console.log(`Видалено з кешу: ${key}`);
                });
            });
            
        } catch (error) {
            console.warn('Помилка очищення кешу:', error);
        }
    }

    // === МЕТОДИ ДЛЯ API ЗАПИТІВ ===

    // Універсальний метод для API запитів з кешуванням
    async makeAPIRequest(endpointName, params = {}, options = {}) {
        try {
            const apiConfig = await this.getAPIConfig();
            const url = await this.getFullAPIUrl(endpointName);
            
            // Формуємо параметри запиту
            const urlParams = new URLSearchParams(params);
            const fullUrl = Object.keys(params).length > 0 ? `${url}?${urlParams}` : url;
            
            // Ключ для кешування
            const cacheKey = `${endpointName}_${urlParams.toString()}`;
            
            // Перевіряємо кеш якщо не форсований оновлення
            if (!options.forceRefresh) {
                const cached = await this.getCacheData(endpointName, cacheKey);
                if (cached) {
                    return cached;
                }
            }

            console.log(`API запит: ${fullUrl}`);

            // Робимо запит з timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), apiConfig.timeout || 10000);

            const response = await fetch(fullUrl, {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Зберігаємо в кеш
            await this.setCacheData(endpointName, cacheKey, data);
            
            return data;

        } catch (error) {
            console.error(`Помилка API запиту ${endpointName}:`, error);
            
            // Fallback на кешовані дані при помилці
            if (options.fallbackToCache !== false) {
                const cacheKey = `${endpointName}_${new URLSearchParams(params).toString()}`;
                const cached = await this.getCacheData(endpointName, cacheKey);
                if (cached) {
                    console.warn('Використовуємо кешовані дані через помилку API');
                    return cached;
                }
            }
            
            throw error;
        }
    }

    // === КОНКРЕТНІ API МЕТОДИ ===

    // Отримання списку факультетів
    async getFaculties(options = {}) {
        return this.makeAPIRequest('faculties', {}, options);
    }

    // Отримання груп за факультетом
    async getGroups(facultyId, options = {}) {
        return this.makeAPIRequest('groups', { idFaculty: facultyId }, options);
    }

    // Отримання кафедр за факультетом
    async getCafedras(facultyId, options = {}) {
        return this.makeAPIRequest('cafedras', { idFaculty: facultyId }, options);
    }

    // Отримання викладачів за кафедрою
    async getInstructors(cafedraId, options = {}) {
        return this.makeAPIRequest('instructors', { idCafedra: cafedraId }, options);
    }

    // Отримання розкладу для групи
    async getGroupSchedule(groupId, date, options = {}) {
        const dateStr = this.formatDateForAPI(date);
        return this.makeAPIRequest('scheduleGroup', { groupId, date: dateStr }, options);
    }

    // Отримання розкладу для викладача
    async getInstructorSchedule(instructorId, date, options = {}) {
        const dateStr = this.formatDateForAPI(date);
        return this.makeAPIRequest('scheduleInstructor', { instructorId, date: dateStr }, options);
    }

    // === МЕТОДИ ДЛЯ РОБОТИ З КОНФІГУРАЦІЄЮ РОЗКЛАДУ ===

    // Отримання типів занять
    async getLessonTypes() {
        const config = await this.loadConfig();
        return config.classSchedule?.lessonTypes || {};
    }

    // Отримання періодів занять
    async getClassSchedulePeriods() {
        const config = await this.loadConfig();
        return config.classSchedule?.periods || [];
    }

    // Отримання UI налаштувань
    async getUIConfig() {
        const config = await this.loadConfig();
        return config.ui || {};
    }

    // Отримання налаштувань локалізації
    async getLocalization() {
        const config = await this.loadConfig();
        return config.localization || {};
    }

    // Отримання повідомлень локалізації
    async getMessages() {
        const localization = await this.getLocalization();
        return localization.messages || {};
    }

    // === ДОПОМІЖНІ МЕТОДИ ===

    // Форматування дати для API (DD-MM-YYYY)
    formatDateForAPI(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    }

    // Форматування дати для відображення
    async formatDateForDisplay(date) {
        const localization = await this.getLocalization();
        const d = new Date(date);
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return d.toLocaleDateString('uk-UA', options);
    }

    // Отримання назви дня тижня
    async getDayName(date, short = false) {
        const localization = await this.getLocalization();
        const days = short ? localization.days?.short : localization.days?.long;
        
        if (days) {
            return days[new Date(date).getDay()];
        }
        
        // Fallback
        const fallbackDays = short 
            ? ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
            : ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];
        return fallbackDays[new Date(date).getDay()];
    }

    // Перевірка чи увімкнена функція
    async isFeatureEnabled(featureName) {
        const config = await this.loadConfig();
        return config.features?.[featureName] === true;
    }

    // Отримання налаштувань обробки помилок
    async getErrorHandling() {
        const config = await this.loadConfig();
        return config.errorHandling || {
            showDetails: false,
            autoRetry: true,
            retryDelay: 2000,
            maxRetries: 2,
            fallbackToCache: true
        };
    }
}

// Експортуємо єдиний екземпляр
export const config = new ConfigLoader();