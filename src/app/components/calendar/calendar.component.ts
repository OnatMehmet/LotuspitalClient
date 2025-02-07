import { Component, OnInit } from '@angular/core';
import { CalendarEvent, CalendarMonthViewDay, CalendarUtils } from 'angular-calendar';
import { addDays } from 'date-fns';
import { CommonModule } from '@angular/common'; // CommonModule ekleyin
import { CalendarModule } from 'angular-calendar'; // CalendarModule'u dahil edin
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-calendar',
  standalone: true, // Standalone bileşen olarak işaret ediyoruz
  imports: [CommonModule, CalendarModule, RouterLink], // Gerekli modülleri burada import ediyoruz
  providers: [CalendarUtils], // CalendarUtils'i burada provider olarak sağlıyoruz
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
