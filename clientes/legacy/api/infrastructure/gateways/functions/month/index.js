const Holidays = require('date-holidays');
const moment = require('moment');
const hd = new Holidays('BR');
require('moment/locale/pt-br');

const getHolidaysInMonth = (year, month) => {
    const holidays = hd.getHolidays(year);

    const holidaysInMonth = holidays.filter(holiday => {
        const date = moment(holiday.date);
        return date.year() === year && date.month() + 1 === month;
    });
    return holidaysInMonth.map(holiday => {
        return {
            date: moment(holiday.date).format('YYYY-MM-DD'),
            name: holiday.name
        }
    });
}

const monthData = (data, events) => {
    moment.locale('pt-br');
    const now = moment(data);
    const startOfMonth = now.clone().startOf('month');
    const endOfMonth = now.clone().endOf('month');

    const year = now.year();
    const month = now.month() + 1;

    const holidays = getHolidaysInMonth(year, month);
    const daysInMonth = [];

    const today = moment().format('YYYY-MM-DD');

    const daysInMonthCalc = moment(data, 'YYYY-MM').daysInMonth();

    let subtractPreviusMonth = 0;
    if (daysInMonthCalc === 31 || daysInMonthCalc === 28) subtractPreviusMonth = 3;
    if (daysInMonthCalc === 30) subtractPreviusMonth = 6;
    if (daysInMonthCalc === 29) subtractPreviusMonth = 4;



    const startOfPreviousMonth = startOfMonth.clone().subtract(1, 'month').endOf('month').subtract(subtractPreviusMonth, 'days');
    for (let day = startOfPreviousMonth; day.isBefore(startOfMonth); day.add(1, 'days')) {
        const dayFormatted = day.format('YYYY-MM-DD');

        const hasEvent = events.some(event => moment(event.data).format('YYYY-MM-DD') === dayFormatted);
        const countEvents = events.filter(event => moment(event.data).format('YYYY-MM-DD') === dayFormatted).length;
        const isHoliday = holidays.find(holiday => holiday.date === dayFormatted);
        daysInMonth.push({
            day: dayFormatted,
            isThisMonth: false,
            hasEvent,
            total: countEvents,
            isHoliday: isHoliday ? true : false,
            isToday: moment(dayFormatted).isSame(today, 'day'),
            holidays: isHoliday ? holidays.filter(holiday => holiday.date === dayFormatted) : []
        });
    }

    // Adicionar todos os dias do mês atual
    for (let day = startOfMonth; day.isBefore(endOfMonth) || day.isSame(endOfMonth, 'day'); day.add(1, 'days')) {
        const dayFormatted = day.format('YYYY-MM-DD');

        const hasEvent = events.some(event => moment(event.data).format('YYYY-MM-DD') === dayFormatted);
        const countEvents = events.filter(event => moment(event.data).format('YYYY-MM-DD') === dayFormatted).length;

        const isHoliday = holidays.find(holiday => holiday.date === dayFormatted);
        daysInMonth.push({
            day: dayFormatted,
            isThisMonth: true,
            hasEvent,
            total: countEvents,
            isHoliday: isHoliday ? true : false,
            isToday: moment(dayFormatted).isSame(today, 'day'),
            holidays: isHoliday ? holidays.filter(holiday => holiday.date === dayFormatted) : []
        });
    }

    // Adicionar os primeiros 7 dias do próximo mês
   let addNextMonth = 0;
    if (daysInMonthCalc === 31) addNextMonth = 6;
    if (daysInMonthCalc === 30) addNextMonth = 4;
    if (daysInMonthCalc === 29) addNextMonth = 7;
    if (daysInMonthCalc === 28) addNextMonth = 9;

    const startOfNextMonth = endOfMonth.clone().add(1, 'day');
    const endOfNextWeek = startOfNextMonth.clone().add(addNextMonth, 'days');
    for (let day = startOfNextMonth; day.isBefore(endOfNextWeek) || day.isSame(endOfNextWeek, 'day'); day.add(1, 'days')) {
        const dayFormatted = day.format('YYYY-MM-DD');

        const hasEvent = events.some(event => moment(event.data).format('YYYY-MM-DD') === dayFormatted);
        const countEvents = events.filter(event => moment(event.data).format('YYYY-MM-DD') === dayFormatted).length;

        const isHoliday = holidays.find(holiday => holiday.date === dayFormatted);

        daysInMonth.push({
            day: dayFormatted,
            isThisMonth: false,
            hasEvent,
            total: countEvents,
            isHoliday: isHoliday ? true : false,
            isToday: moment(dayFormatted).isSame(today, 'day'),
            holidays: isHoliday ? holidays.filter(holiday => holiday.date === dayFormatted) : []
        });
    }

    const nameMonth = now.format('MMMM');
    return {
        daysInMonth,
        nameMonth: nameMonth.toUpperCase(),
        month: now.format('MMMM'),
        year: now.format('YYYY')
    }
}

module.exports = monthData;
