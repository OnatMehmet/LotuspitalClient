import { Subject } from 'rxjs';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CalendarDateFormatter, CalendarEvent, CalendarEventTimesChangedEvent, CalendarView, DAYS_OF_WEEK } from 'angular-calendar';
import { HomeComponent } from '../home/home.component';
import { AppointmentsComponent } from '../appointments/appointments.component';
import { AppointmentModel } from '../../models/appointment.model';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css',
  providers: [
    {
      provide: CalendarDateFormatter,
      // useClass: MyCalendarDateFormatter,
    },
  ],
  
})
export class CalendarComponent extends AppointmentsComponent implements OnInit {

  @Input('showActions')
  showActions : boolean = false;
  editID: number = 0;

  isInstructor: boolean = false;
  isAdmin: boolean = false;
  isStudent: boolean = false;

  isVisibleAddModal: boolean = false;
  isVisibleEditModal: boolean = false;

  // calendar configuration
  view: CalendarView = CalendarView.Week;
  CalendarView = CalendarView;
  viewDate: Date = new Date();
  locale: string = 'tr';
  refresh: Subject<any> = new Subject();
  weekStartsOn: number = DAYS_OF_WEEK.MONDAY;
  weekendDays: number[] = [DAYS_OF_WEEK.SATURDAY, DAYS_OF_WEEK.SUNDAY];
  arrayColors : {companyID:number,color:string}[] = [];
  arrayColorCodes : {companyID:number,color:string}[] = [];
  dateWithoutTime = this.viewDate.toLocaleDateString();
  // end of calendar configuration

  // filter properties
  @Input('showFilters')
  showFilters: boolean = true;
  @Input('showInstructorFilter')
  showInstructorFilter: boolean = true;
  @Input('showCompanyFilter')
  showCompanyFilter: boolean = true;
  @Input('showTrainingFilter')
  showTrainingFilter: boolean = true;
  @Input('showActivityTypeFilter')
  showActivityTypeFilter: boolean = true;
  @Input('instructorID')
  instructorID: string = "";
  @Input('companyID')
  companyID: string = "";
  @Input('trainingID')
  trainingID: string = "";
  @Input('activityType')
  activityType: number = 1;
  @Input('showGeneralFilter')
  showGeneralFilter: boolean = false;
  // end of filter properties
  
  events: CalendarEvent[] = []

  modalVirtualData: AppointmentModel[] = [];


  ngOnInit() {

    
    if(!this.showGeneralFilter){
      if(this.isInstructor){
        this.showInstructorFilter = false;
      }
    }

    
  }

  showCreateModal(){
    this.isVisibleAddModal = true;
  }
    



  isVisibleVirtualModal:boolean=false;
  isVisibleActivityModal:boolean=false;


  /////month
  activeDayIsOpen: boolean = true;
  modalData!: {
    action: string;
    event: CalendarEvent;
  };
  eventTimesChanged({
    event,
    newStart,
    newEnd,
  }: CalendarEventTimesChangedEvent): void {
    this.events = this.events.map((iEvent) => {
      
      if (iEvent === event) {
        return {
          ...event,
          start: newStart,
          end: newEnd,
        };
      }
      return iEvent;
    });
    // this.infoModal(event);
  }
  dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
    
  }


    deleteModel(id = 1) {

  }
}