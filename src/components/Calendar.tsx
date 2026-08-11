"use client";

import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek, isBefore, startOfDay, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Calendar.module.css";

interface CalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  disabledDaysOfWeek?: number[]; // 0 = Sunday, 1 = Monday...
  closedDates?: Date[]; // specific dates the salon is closed
  adminMode?: boolean; // if true, allows selecting disabled/closed dates
  appointments?: Array<{ date: string; status?: string }>;
  appointmentCounts?: Record<string, number>;
}

export default function Calendar({ selectedDate, onSelectDate, disabledDaysOfWeek = [], closedDates = [], adminMode = false, appointments = [], appointmentCounts }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const isClosedDate = (date: Date) => {
    return closedDates.some(closedDate => isSameDay(date, closedDate));
  };

  const getApptCount = (day: Date) => {
    const formatted = format(day, "dd/MM/yyyy");
    if (appointmentCounts && appointmentCounts[formatted] !== undefined) {
      return appointmentCounts[formatted];
    }
    if (appointments && appointments.length > 0) {
      return appointments.filter(a => a.date === formatted && a.status !== 'canceled').length;
    }
    return 0;
  };

  return (
    <div className={styles.calendarWrapper}>
      <div className={styles.header}>
        <button type="button" onClick={prevMonth} className={styles.navButton}>
          <ChevronLeft size={20} />
        </button>
        <div className={styles.monthYear}>
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </div>
        <button type="button" onClick={nextMonth} className={styles.navButton}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className={styles.weekDays}>
        {weekDays.map((day) => (
          <div key={day} className={styles.weekDay}>
            {day}
          </div>
        ))}
      </div>

      <div className={styles.daysGrid}>
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
          const isDayOfWeekDisabled = disabledDaysOfWeek.includes(getDay(day));
          const isClosed = isClosedDate(day);
          
          let disabled = false;
          if (adminMode) {
            disabled = !isCurrentMonth;
          } else {
            disabled = isPast || !isCurrentMonth || isDayOfWeekDisabled || isClosed;
          }
          
          const selected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);
          const apptCount = isCurrentMonth ? getApptCount(day) : 0;

          return (
            <button
              key={day.toString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(day)}
              className={`
                ${styles.dayButton} 
                ${!isCurrentMonth ? styles.emptyDay : ""}
                ${selected ? styles.selected : ""}
                ${today && !selected ? styles.today : ""}
                ${disabled && isCurrentMonth && !adminMode ? styles.disabled : ""}
                ${isClosed && isCurrentMonth ? styles.closed : ""}
              `}
            >
              <span>{format(day, "d")}</span>
              {adminMode && apptCount > 0 && (
                <span className={styles.apptBadge} title={`${apptCount} ${apptCount === 1 ? 'agendamento' : 'agendamentos'}`}>
                  {apptCount}
                </span>
              )}

            </button>
          );
        })}
      </div>
    </div>
  );
}
