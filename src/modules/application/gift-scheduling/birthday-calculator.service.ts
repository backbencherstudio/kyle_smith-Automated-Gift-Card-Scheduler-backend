import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class BirthdayCalculatorService {
  /**
   * Returns the next birthday (at 00:00) as a dayjs object.
   * If today is the birthday, returns today at 00:00.
   */
  getNextBirthday(birthday: Date, now: Date = new Date()): dayjs.Dayjs {
    const today = dayjs(now);
    const bday = dayjs(birthday);

    // Set next birthday to this year
    let next = today
      .year(today.year())
      .month(bday.month())
      .date(bday.date())
      .startOf('day');

    // If birthday has already passed this year, set to next year
    if (next.isBefore(today, 'day')) {
      next = next.add(1, 'year');
    }

    // If today is the birthday, return today
    if (next.isSame(today, 'day')) {
      return today.startOf('day');
    }

    return next;
  }

  /**
   * Returns the delay in milliseconds until the next birthday at 00:00.
   * If today is the birthday or birthday is in the past, returns 0.
   */
  getDelayUntilNextBirthday(birthday: Date, now: Date = new Date()): number {
    const nextBirthday = this.getNextBirthday(birthday, now);
    const nowDayjs = dayjs(now);

    // If today is the birthday, or birthday is in the past, deliver immediately
    if (
      nextBirthday.isSame(nowDayjs, 'day') ||
      nextBirthday.isBefore(nowDayjs)
    ) {
      return 0;
    }

    return nextBirthday.diff(nowDayjs, 'millisecond');
  }

  /**
   * Returns detailed delay information for debugging
   */
  getDelayInfo(birthday: Date, now: Date = new Date()) {
    const delay = this.getDelayUntilNextBirthday(birthday, now);
    const nextBirthday = this.getNextBirthday(birthday, now);

    // Calculate exact time differences using dayjs
    const currentDate = dayjs(now);
    const nextBirthdayDate = dayjs(nextBirthday);

    const exactDays = nextBirthdayDate.diff(currentDate, 'day');
    const exactHours = nextBirthdayDate.diff(currentDate, 'hour');
    const exactMinutes = nextBirthdayDate.diff(currentDate, 'minute');
    const exactSeconds = nextBirthdayDate.diff(currentDate, 'second');

    // Calculate remaining components for DHMS format
    const remainingHours = exactHours % 24;
    const remainingMinutes = exactMinutes % 60;
    const remainingSeconds = exactSeconds % 60;

    // Calculate detailed time breakdown for full format
    const totalSeconds = Math.floor(delay / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    // Calculate remaining time components for full format
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30); // Approximate months
    const days = (totalDays % 365) % 30; // Remaining days
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;
    const seconds = totalSeconds % 60;
    const milliseconds = delay % 1000;

    // Create both format views
    const inlineFormat = this.createInlineFormat(
      years,
      months,
      days,
      hours,
      minutes,
      seconds,
    );
    const dhmsFormat = this.createDHMSFormat(
      exactDays,
      remainingHours,
      remainingMinutes,
      remainingSeconds,
    );

    return {
      delayMs: delay,
      delayDays: delay / (1000 * 60 * 60 * 24),
      delayHours: delay / (1000 * 60 * 60),
      delayMinutes: delay / (1000 * 60),
      delaySeconds: delay / 1000,

      // Both format views
      inlineFormat: inlineFormat, // Full format without milliseconds
      dhmsFormat: dhmsFormat, // Days, hours, minutes, seconds only (EXACT calculation)

      // Detailed breakdown
      breakdown: {
        years: years,
        months: months,
        days: days,
        hours: hours,
        minutes: minutes,
        seconds: seconds,
        milliseconds: milliseconds,
      },

      // Exact calculations using dayjs
      exact: {
        days: exactDays,
        hours: exactHours,
        minutes: exactMinutes,
        seconds: exactSeconds,
        remainingHours: remainingHours,
        remainingMinutes: remainingMinutes,
        remainingSeconds: remainingSeconds,
      },

      nextBirthday: nextBirthday.toISOString(),
      currentDate: now.toISOString(),
      isImmediate: delay === 0,
      expectedDeliveryDate: nextBirthday.format('YYYY-MM-DD HH:mm:ss'),

      // Additional info
      recipientBirthday: birthday.toISOString(),
      recipientBirthdayFormatted: dayjs(birthday).format('YYYY-MM-DD'),
      nextBirthdayFormatted: nextBirthday.format('YYYY-MM-DD'),
      currentDateFormatted: currentDate.format('YYYY-MM-DD HH:mm:ss'),
    };
  }

  /**
   * Creates inline format: "x year x months x days x hours x minutes x seconds" (NO MILLISECONDS)
   */
  private createInlineFormat(
    years: number,
    months: number,
    days: number,
    hours: number,
    minutes: number,
    seconds: number,
  ): string {
    if (
      years === 0 &&
      months === 0 &&
      days === 0 &&
      hours === 0 &&
      minutes === 0 &&
      seconds === 0
    ) {
      return 'Immediate';
    }

    const parts = [];

    if (years > 0) {
      parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
    }
    if (months > 0) {
      parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
    }
    if (days > 0) {
      parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
    }
    if (hours > 0) {
      parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    }
    if (minutes > 0) {
      parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    }
    if (seconds > 0) {
      parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
    }

    return parts.join(' ');
  }

  /**
   * Creates DHMS format: "x days x hours x minutes x seconds" (EXACT calculation)
   */
  private createDHMSFormat(
    days: number,
    hours: number,
    minutes: number,
    seconds: number,
  ): string {
    if (days === 0 && hours === 0 && minutes === 0 && seconds === 0) {
      return 'Immediate';
    }

    const parts = [];

    if (days > 0) {
      parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
    }
    if (hours > 0) {
      parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    }
    if (minutes > 0) {
      parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    }
    if (seconds > 0) {
      parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
    }

    return parts.join(' ');
  }

  /**
   * Logs detailed delay information for testing
   */
  logDelayInfo(birthday: Date, now: Date = new Date()) {
    const info = this.getDelayInfo(birthday, now);

    console.log('=== BIRTHDAY SCHEDULING DEBUG INFO ===');
    console.log(`📅 Current Date: ${info.currentDateFormatted}`);
    console.log(` Recipient Birthday: ${info.recipientBirthdayFormatted}`);
    console.log(`🎉 Next Birthday: ${info.nextBirthdayFormatted}`);
    console.log(` Expected Delivery: ${info.expectedDeliveryDate}`);
    console.log('');
    console.log('⏰ DELAY BREAKDOWN:');
    console.log(`   Total milliseconds: ${info.delayMs.toLocaleString()}`);
    console.log(`   Total days: ${info.delayDays.toFixed(2)}`);
    console.log(`   Total hours: ${info.delayHours.toFixed(2)}`);
    console.log(`   Total minutes: ${info.delayMinutes.toFixed(2)}`);
    console.log(`   Total seconds: ${info.delaySeconds.toFixed(2)}`);
    console.log('');
    console.log(' FORMAT VIEWS:');
    console.log(`   Full Format: ${info.inlineFormat}`);
    console.log(`   DHMS Format: ${info.dhmsFormat}`);
    console.log('');
    console.log(' DETAILED BREAKDOWN:');
    console.log(`   Years: ${info.breakdown.years}`);
    console.log(`   Months: ${info.breakdown.months}`);
    console.log(`   Days: ${info.breakdown.days}`);
    console.log(`   Hours: ${info.breakdown.hours}`);
    console.log(`   Minutes: ${info.breakdown.minutes}`);
    console.log(`   Seconds: ${info.breakdown.seconds}`);
    console.log(`   Milliseconds: ${info.breakdown.milliseconds}`);
    console.log('');

    if (info.isImmediate) {
      console.log(' EMAIL WILL BE SENT IMMEDIATELY (Birthday is today!)');
    } else {
      console.log(` EMAIL WILL BE SENT IN: ${info.inlineFormat}`);
      console.log(` OR: ${info.dhmsFormat}`);
    }
    console.log('=====================================');
  }
}
