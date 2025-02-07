import { Component} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DataTablesModule } from 'angular-datatables';
import { CalendarModule } from 'angular-calendar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, DataTablesModule,CalendarModule],
  template: "<router-outlet></router-outlet>"
})
export class AppComponent {
}
