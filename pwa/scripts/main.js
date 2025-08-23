import { WeekCalculator } from './week-calculator.js';
import { config } from './config-loader.js';

// Імпорти для розкладу занять (будуть створені пізніше)
// import { SettingsScheduleManager } from './settings-schedule-manager.js';
// import { ScheduleRenderer } from './schedule-renderer.js';

// Глобальні змінні
let selectedDate = new Date();
let weekCalculator;

// Нові змінні для розкладу занять
let scheduleInitialized = false;
let settingsManager = null;
let scheduleRenderer = null;

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

// === НОВА ЛОГІКА ДЛЯ РОЗКЛАДУ ЗАНЯТЬ ===

// Ініціалізація розкладу занять
async function initScheduleTab() {
    console.log('Ініціалізація вкладки розкладу занять');
    
    if (scheduleInitialized) {
        console.log('Розклад вже ініціалізовано');
        return;
    }
    
    try {
        // Перевіряємо чи є збережені налаштування
        const savedSettings = localStorage.getItem('scheduleSettings');
        
        if (!savedSettings) {
            console.log('Налаштування розкладу відсутні, показуємо модалку');
            await showScheduleSettings();
        } else {
            console.log('Знайдено збережені налаштування:', JSON.parse(savedSettings));
            await loadScheduleContent();
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
    
    // TODO: Реалізувати після створення settings-schedule-manager.js
    // if (!settingsManager) {
    //     const { SettingsScheduleManager } = await import('./settings-schedule-manager.js');
    //     settingsManager = new SettingsScheduleManager();
    // }
    // settingsManager.show();
    
    // Тимчасова заглушка
    const scheduleContent = document.getElementById('schedule-content');
    if (scheduleContent) {
        scheduleContent.innerHTML = `
            <div class="grid gap-4">
                <div class="card rounded-lg shadow-md overflow-hidden">
                    <div class="bg-indigo-100 dark:bg-indigo-900 p-3">
                        <h3 class="text-lg font-semibold text-indigo-800 dark:text-indigo-200">Налаштування розкладу</h3>
                    </div>
                    <div class="p-4">
                        <p class="text-center text-gray-600 dark:text-gray-400 mb-4">
                            Для перегляду розкладу занять необхідно налаштувати параметри
                        </p>
                        <button id="configure-schedule" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition">
                            Налаштувати розклад
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Додаємо обробник для тимчасової кнопки
        const configBtn = document.getElementById('configure-schedule');
        if (configBtn) {
            configBtn.addEventListener('click', () => {
                alert('Модалка налаштувань буде реалізована на наступному кроці');
            });
        }
    }
}

// Завантаження контенту розкладу
async function loadScheduleContent() {
    console.log('Завантаження контенту розкладу');
    
    const scheduleContent = document.getElementById('schedule-content');
    if (scheduleContent) {
        scheduleContent.innerHTML = `
            <div class="grid gap-4">
                <div class="card rounded-lg shadow-md overflow-hidden">
                    <div class="bg-indigo-100 dark:bg-indigo-900 p-3">
                        <h3 class="text-lg font-semibold text-indigo-800 dark:text-indigo-200">Розклад навчальних занять</h3>
                    </div>
                    <div class="p-4">
                        <p class="text-center text-gray-600 dark:text-gray-400">
                            Тут буде відображено розклад занять...
                        </p>
                        <div class="mt-4 space-y-2">
                            <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                <strong>Налаштування знайдено:</strong><br>
                                <span class="text-sm text-gray-600 dark:text-gray-300">${localStorage.getItem('scheduleSettings')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
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
                        <p class="text-red-600 dark:text-red-400">${message}</p>
                        <button id="retry-schedule" class="mt-4 w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition">
                            Спробувати знову
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const retryBtn = document.getElementById('retry-schedule');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
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
            
            // Якщо натиснуто на "розклад" - ініціалізуємо розклад занять
            if (targetTab === 'schedule') {
                await initScheduleTab();
            }
        });
    });
}

// Запуск при завантаженні DOM
document.addEventListener('DOMContentLoaded', init);