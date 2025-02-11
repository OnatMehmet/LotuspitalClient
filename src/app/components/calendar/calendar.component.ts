import { Component, OnInit } from '@angular/core';
import { CalendarEvent, CalendarMonthViewDay, CalendarUtils } from 'angular-calendar';
import { addDays } from 'date-fns';
import { CommonModule } from '@angular/common'; // CommonModule ekleyin
import { CalendarModule } from 'angular-calendar'; // CalendarModule'u dahil edin
import { RouterLink } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker'; // MatDatepickerModule import ediyoruz
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core'; // DateAdapter'ı import ediyoruz
import { MatNativeDateModule } from '@angular/material/core'; // NativeDateModule import
import { MomentDateAdapter } from '@angular/material-moment-adapter'; // MomentDateAdapter'ı import ediyoruz
import * as moment from 'moment';  // Moment'i import ediyoruz
// MY_FORMATS tarih formatları tanımlaması
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'LL', // 'LL' Moment.js formatı (örneğin: 'February 7, 2025')
  },
  display: {
    dateInput: 'LL', // 'LL' formatı gösterim için de kullanılacak
    monthInput: 'MMM YYYY', // örnek: 'Feb 2025'
    dateA11yLabel: 'LL', // Erişilebilirlik (accessibility) etiketi
    monthA11yLabel: 'MMM YYYY', // Erişilebilirlik etiketi
  },
};
@Component({
  selector: 'app-calendar',
  standalone: true, // Standalone bileşen olarak işaret ediyoruz
  imports: [CommonModule, CalendarModule.forRoot(), RouterLink,MatDatepickerModule, MatNativeDateModule], // Gerekli modülleri burada import ediyoruz
  providers: [CalendarUtils,MatDatepickerModule, 
    { provide: DateAdapter, useClass: MomentDateAdapter },  // MomentDateAdapter'ı provider olarak ekliyoruz
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }  // Formatları özelleştirebilirsiniz
  ],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  viewDate: Date = new Date();
  events: CalendarEvent[] = [];

  constructor() {}

  ngOnInit(): void {
    this.generateSampleEvents();
  }

  // Örnek etkinlikler ekleme
  generateSampleEvents() {
    this.events = [
      {
        start: new Date(),
        title: 'Randevu 1'
      },
      {
        start: addDays(new Date(), 2),
        title: 'Randevu 2'
      },
      {
        start: addDays(new Date(), 4),
        title: 'Randevu 3'
      }
    ];
  }

  // Gün tıklama olayını işleme
  dayClicked({ day }: { day: CalendarMonthViewDay }): void {
    console.log(day); // Günü konsola yazdır
    if (day.events && day.events.length > 0) {
      alert(`Gün: ${day.date}, Etkinlik: ${day.events[0].title}`);
    } else {
      alert('Bu günde etkinlik yok!');
    }
  }
}
