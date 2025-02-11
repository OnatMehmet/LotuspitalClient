import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LayoutsComponent } from './components/layouts/layouts.component';
import { HomeComponent } from './components/home/home.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { PersonnelsComponent } from './components/personnels/personnels.component';
import { PatientsComponent } from './components/patients/patients.component';
import { AppointmentsComponent } from './components/appointments/appointments.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { NewComponent } from './components/patients/new/new.component';
import { AppointmentNewComponent } from './components/appointments/appointment-new/appointment-new.component';
import { PatientProfileComponent } from './components/patients/patient-profile/patient-profile.component';

export const routes: Routes = [

    {
        path:"login",
        component:LoginComponent
    },
    {
        path:"",
        component: LayoutsComponent,
        canActivateChild: [() => inject(AuthService).isAuthenticated()],
        children: 
        [
            { path:"", component:HomeComponent},
            { path:"personnels", component:PersonnelsComponent},
            { path:"patients", component:PatientsComponent},
            { path:"appointments", component:AppointmentsComponent},
            {path:"calendar", component:CalendarComponent},
            {path:"patients/new", component:NewComponent},
            {path:"appointments/appointment-new", component:AppointmentNewComponent},
            { path: 'hasta-profil/:id', component: PatientProfileComponent}
        ]
    },
    {
        path:"**",
        component:NotFoundComponent
    }
];
