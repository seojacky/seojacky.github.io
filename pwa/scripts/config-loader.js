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
            const configPath = `settings/universities/${this.universityCode}/config.json`;
            const response = await fetch(configPath);
            
            if (!response.ok) {
                throw new Error(`Не вдалося завантажити конфігурацію: ${response.status}`);
            }
            
            this.config = await response.json();
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
                ]
            }
        };
    }

    // Отримання розкладу дзвінків
    async getBellSchedule() {
        const config = await this.loadConfig();
        return config.schedule?.bellSchedule || [];
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
}

// Експортуємо єдиний екземпляр
export const config = new ConfigLoader();