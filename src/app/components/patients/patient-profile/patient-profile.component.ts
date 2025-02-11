import { Component, OnInit } from '@angular/core';
import { PatientProfile } from '../../../models/patient-profile.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PatientService } from '../../../services/patient.service';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-profile.component.html',
  styleUrl: './patient-profile.component.css'
})
export class PatientProfileComponent implements OnInit {
  patientId: string = '';
  patientData: any = {}; // Hasta bilgileri
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,  // ActivatedRoute servisi ile parametre alıyoruz
    private patientService: PatientService  // Hasta bilgilerini API'den alacak servis
  ) {}

  ngOnInit(): void {
    // URL parametresinden hasta ID'sini alıyoruz
    this.patientId = this.route.snapshot.paramMap.get('id')!;

    // ID'yi aldıktan sonra API'den hastanın bilgilerini çekiyoruz
    this.getPatientData();
  }


  patientProfile: PatientProfile = {
    name: 'Ali',
    surname: 'Yılmaz',
    age: 35,
    gender: 'Erkek',
    phone: '555-1234-5678',
    email: 'ali.yilmaz@example.com',
    address: 'İstanbul, Türkiye'
  };

  // Hasta bilgilerini API'den alma fonksiyonu
  getPatientData(): void {
    this.patientService.getPatientById(this.patientId).subscribe(
      (data) => {
        this.patientData = data;  // API'den gelen veriyi alıyoruz
        this.isLoading = false;  // Veri geldiğinde loading durumu false
      },
      (error) => {
        this.errorMessage = 'Hasta bilgileri alınamadı!';
        this.isLoading = false;  // Veri çekme hatası durumunda loading durumu false
      }
    );
  }

  // Hasta profilini güncelleme fonksiyonu
  updateProfile(updatedProfile: PatientProfile): void {
    this.patientProfile = { ...updatedProfile };  // Veriyi güncelle
    console.log('Hasta profili güncellendi', this.patientProfile);
  }
}
