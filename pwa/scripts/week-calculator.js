import { config } from './config-loader.js';

export class WeekCalculator {
    constructor() {
        this.startDate = null;
    }

    async init() {
        const startDateStr = await config.getAcademicYearStart();
        this.startDate = new Date(startDateStr);
    }

    async getCurrentWeekNumber() {
        if (!this.startDate) {
            await this.init();
        }
        const currentDate = new Date();
        return this.getWeekNumber(currentDate);
    }

    getWeekNumber(date) {
        if (!this.startDate) {
            throw new Error('WeekCalculator не ініціалізовано');
        }

        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        const weekNumber = Math.ceil((date - this.startDate) / oneWeek);

        if (weekNumber < 1) {
            return "1";
        } else if (weekNumber > 52) {
            return "52";
        } else {
            return weekNumber.toString();
        }
    }

    async getWeekText() {
        const weekNumber = await this.getCurrentWeekNumber();
        return `${weekNumber} тиждень`;
    }
}