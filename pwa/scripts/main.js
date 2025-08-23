import { WeekCalculator } from './week-calculator.js';
import { config } from './config-loader.js';

// Імпорти для розкладу занять
import { SettingsScheduleManager } from './settings-schedule-manager.js';
import { scheduleRenderer } from './schedule-renderer.js';

// Глобальні змінні
let selectedDate = new Date();
let weekCalculator;

// Змінні для розкладу занять
let scheduleInitialized = false;
let settingsManager = null;

// DOM елементи
const scheduleContainer = document.getElementById('schedule-container');
const currentTimeElement = document.getElementById('current-time');
const currentDateElement = document.getElementById('current-date');
const selectedDateElement = document.getElementById('selected-date');

// Дні тижня
const weekDays = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];

// Функція для отримання поточного часу в Києві (з popup.js рядок 366)
async function getKyivCurrentTime() {
    const timeZone = await config.getTimeZone();
    
    const options = {
        timeZone: timeZone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    };

    const formatter = new Intl.DateTimeFormat([], options);
    const parts = formatter.formatToParts(new Date());
    
    const hours = parts.find(part => part.type === 'hour').value;
    const minutes = parts.find(part => part.type === 'minute').value;
    
    return parseInt(hours) * 60 + parseInt(minutes);
}

// Функція для оновлення номера тижня
async function updateWeekInfo() {
    const weekInfoElement = document.getElementById('week-info');
    
    if (!weekInfoElement) return;
    
    try {
        const weekText = await weekCalculator.getWeekText();
        weekInfoElement.textContent = `${weekText}`;
    } catch (error) {
        console.error('Помилка оновлення номера тижня:', error);
        weekInfoElement.textContent = 'Номер тижня невідомий';
    }
}

// Оновлення поточного часу
function updateCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    currentTimeElement.textContent = `${hours}:${minutes}:${seconds}`;
}

// Перевірка чи вибрана дата сьогоднішня
function isSelectedDateToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    return selected.getTime() === today.getTime();
}

// Оновлення відображення вибраної дати
function updateSelectedDateDisplay() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    const dayName = weekDays[selectedDate.getDay()];
    const dateStr = selectedDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
    selectedDateElement.textContent = `${dayName}, ${dateStr}`;
}

// Рендер розкладу з конфігурації
async function renderSchedule() {
    const schedule = await config.getBellSchedule();
    const isToday = isSelectedDateToday();
    
    let html = '';
    
    schedule.forEach((item, index) => {
        const nextItem = schedule[index + 1];
        
        // Рендер пари
        html += `
            <div class="p-4 transition-all duration-200" data-start="${item.start}" data-end="${item.end}">
                <div class="flex justify-between items-center">
                    <div class="flex items-center">
                        <span class="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-semibold mr-3">
                            ${item.number}
                        </span>
                        <div>
                            <p class="font-medium">${item.start} - ${item.end}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Рендер перерви (тонка смужка)
        if (nextItem && item.breakAfter > 0) {
            html += `
                <div class="transition-all duration-200 break" data-start="${item.end}" data-end="${nextItem.start}" style="height: 8px; background-color: transparent;"></div>
            `;
        }
    });
    
    scheduleContainer.innerHTML = html;
    
    // Підсвітка поточної пари (якщо сьогодні)
    if (isToday) {
        await highlightCurrentClass();
    }
}

// Підсвітка поточної пари/перерви 
async function highlightCurrentClass() {
    const scheduleItems = document.querySelectorAll('#schedule-container > div');
    const currentTime = await getKyivCurrentTime();

    scheduleItems.forEach(item => {
        const startTime = item.getAttribute('data-start');
        const endTime = item.getAttribute('data-end');
        
        if (startTime && endTime) {
            const startTimeArray = startTime.split(':');
            const endTimeArray = endTime.split(':');
            const startMinutes = parseInt(startTimeArray[0]) * 60 + parseInt(startTimeArray[1]);
            const endMinutes = parseInt(endTimeArray[0]) * 60 + parseInt(endTimeArray[1]);

            if (currentTime >= startMinutes && currentTime < endMinutes) {
                if (item.classList.contains('break')) {
                    item.classList.add('current-break');
                    item.style.backgroundColor = '#f59e0b';
                } else {
                    item.classList.add('current-class');
                    item.classList.add('current');
                    
                    
                    const circle = item.querySelector('span');
                    circle.className = 'w-8 h-8 flex items-center justify-center rounded-full bg-white text-indigo-600 font-semibold mr-3';
                }
            } else {
                item.classList.remove('current-class', 'current-break', 'current');
                item.style.backgroundColor = 'transparent';
                
                // Повертаємо стандартні стилі кружечка
                const circle = item.querySelector('span');
                if (circle && !item.classList.contains('break')) {
                    circle.className = 'w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-semibold mr-3';
                }
            }
        }
    });
}

// Перевірка поточної пари та оновлення UI
function checkCurrentPair() {
    if (isSelectedDateToday()) {
        highlightCurrentClass();
    }
}

// === ЛОГІКА ДЛЯ РОЗКЛАДУ ЗАНЯТЬ ===

// Ініціалізація розкладу занять
async function initScheduleTab() {
    console.log('Ініціалізація вкладки розкладу занять');
    
    if (scheduleInitialized) {
        console.log('Розклад вже ініціалізовано');
        return;
    }
    
    try {
        // Ініціалізуємо scheduleRenderer
        await scheduleRenderer.init();
        
        // Перевіряємо чи є збережені налаштування
        const savedSettings = localStorage.getItem('scheduleSettings');
        
        if (!savedSettings) {
            console.log('Налаштування розкладу відсутні, показуємо модалку');
            await showScheduleSettings();
        } else {
            const settings = JSON.parse(savedSettings);
            console.log('Знайдено збережені налаштування:', settings);
            await loadScheduleContent(settings);
        }
        
        scheduleInitialized = true;
    } catch (error) {
        console.error('Помилка ініціалізації розкладу:', error);
        showScheduleError('Помилка ініціалізації розкладу: ' + error.message);
    }
}

// Показ модалки налаштувань
async function showScheduleSettings() {
    console.log('Показуємо модалку налаштувань розкладу');
    
    try {
        // Створюємо менеджер налаштувань якщо його немає
        if (!settingsManager) {
            settingsManager = new SettingsScheduleManager();
        }
        
        // Налаштовуємо callback для збереження
        settingsManager.onSave(async (settings) => {
            console.log('Налаштування збережено:', settings);
            await loadScheduleContent(settings);
        });
        
        // Показуємо модалку
        await settingsManager.show();
        
    } catch (error) {
        console.error('Помилка показу модалки налаштувань:', error);
        
        // Fallback - показуємо кнопку для повторної спроби
        const scheduleContent = document.getElementById('schedule-content');
        if (scheduleContent) {
            scheduleContent.innerHTML = `
                <div class="grid gap-4">
                    <div class="card rounded-lg shadow-md overflow-hidden">
                        <div class="bg-red-100 dark:bg-red-900 p-3">
                            <h3 class="text-lg font-semibold text-red-800 dark:text-red-200">Помилка завантаження налаштувань</h3>
                        </div>
                        <div class="p-4">
                            <p class="text-red-600 dark:text-red-400 mb-4">
                                Не вдалося завантажити форму налаштувань: ${error.message}
                            </p>
                            <button id="retry-settings" class="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition">
                                Спробувати знову
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            const retryBtn = document.getElementById('retry-settings');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    settingsManager = null; // Скидаємо менеджер
                    showScheduleSettings();
                });
            }
        }
    }
}

// Завантаження контенту розкладу
async function loadScheduleContent(settings) {
    console.log('Завантаження контенту розкладу для:', settings);
    
    try {
        // Встановлюємо налаштування в renderer
        scheduleRenderer.setSettings(settings);
        
        // Рендеримо розклад з поточними налаштуваннями
        await scheduleRenderer.render(settings, new Date(), 'day');
        
        console.log('Розклад успішно завантажено та відображено');
        
    } catch (error) {
        console.error('Помилка завантаження розкладу:', error);
        showScheduleError('Помилка завантаження розкладу: ' + error.message);
    }
}

// Показ помилки розкладу
function showScheduleError(message) {
    const scheduleContent = document.getElementById('schedule-content');
    if (scheduleContent) {
        scheduleContent.innerHTML = `
            <div class="grid gap-4">
                <div class="card rounded-lg shadow-md overflow-hidden">
                    <div class="bg-red-100 dark:bg-red-900 p-3">
                        <h3 class="text-lg font-semibold text-red-800 dark:text-red-200">Помилка</h3>
                    </div>
                    <div class="p-4">
                        <p class="text-red-600 dark:text-red-400 mb-4">${message}</p>
                        <div class="flex gap-3">
                            <button id="retry-schedule" class="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition">
                                <i class="fas fa-redo mr-2"></i>Спробувати знову
                            </button>
                            <button id="reset-settings" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition">
                                <i class="fas fa-cog mr-2"></i>Налаштування
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const retryBtn = document.getElementById('retry-schedule');
        const resetBtn = document.getElementById('reset-settings');
        
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                scheduleInitialized = false;
                initScheduleTab();
            });
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                localStorage.removeItem('scheduleSettings');
                scheduleInitialized = false;
                initScheduleTab();
            });
        }
    }
}

// Ініціалізація
async function init() {
    try {
        // Ініціалізуємо калькулятор тижнів
        weekCalculator = new WeekCalculator();
        await weekCalculator.init();
        
        await updateWeekInfo();
        updateCurrentTime();
        updateSelectedDateDisplay();
        await renderSchedule();
        
        // Оновлення часу кожну секунду
        setInterval(updateCurrentTime, 1000);
        setInterval(checkCurrentPair, 10000);
        
        // Оновлюємо номер тижня кожну годину
        setInterval(updateWeekInfo, 60 * 60 * 1000);
        
        // Додаємо обробник для вкладок
        setupTabHandlers();
        
    } catch (error) {
        console.error('Помилка ініціалізації:', error);
        // Показуємо базовий заголовок якщо не вдалося завантажити номер тижня
        const weekInfoElement = document.getElementById('week-info');
        if (weekInfoElement) {
            weekInfoElement.textContent = 'Розклад дзвінків';
        }
        
        // Продовжуємо ініціалізацію решти функцій
        updateCurrentTime();
        updateSelectedDateDisplay();
        await renderSchedule();
        
        setInterval(updateCurrentTime, 1000);
        setInterval(checkCurrentPair, 10000);
        
        // Додаємо обробник для вкладок навіть при помилці
        setupTabHandlers();
    }
}

// Налаштування обробників вкладок
function setupTabHandlers() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const targetTab = button.dataset.tab;
            
            console.log(`Перемикання на вкладку: ${targetTab}`);
            
            // Якщо натиснуто на "розклад" - ініціалізуємо розклад занять
            if (targetTab === 'schedule') {
                try {
                    await initScheduleTab();
                } catch (error) {
                    console.error('Помилка ініціалізації вкладки розкладу:', error);
                    showScheduleError('Критична помилка ініціалізації: ' + error.message);
                }
            }
        });
    });
}

// Обробка зміни розміру вікна для scheduleRenderer
window.addEventListener('resize', () => {
    if (scheduleRenderer && scheduleRenderer.hasData()) {
        // Перерендеримо тільки якщо є дані та змінився breakpoint
        scheduleRenderer.renderCurrentData();
    }
});

// Запуск при завантаженні DOM
document.addEventListener('DOMContentLoaded', init);