import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { api } from '../constants';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private apiUrl = api+'/patients-profile'; // API URL'si
  constructor(private http: HttpClient) { }


    // Hasta bilgilerini ID'ye göre çekme fonksiyonu
    getPatientById(id: string): Observable<any> {
      return this.http.get(`${this.apiUrl}/${id}`);
    }
}
