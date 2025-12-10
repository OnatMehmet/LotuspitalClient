import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { WebSocketEimzaService, Certificate, Terminal } from '../services/websocket-eimza.service';
import { IModalStateService } from '../../services/imodalstateservice';
import { IModalInfo } from '../../model/imodalinfo';
import { ModalResult } from '../../model/modalresult';
import { DialogResult } from '../../model/dialogresult';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cardlogin',
  templateUrl: './cardlogin.component.html',
  styleUrls: ['./cardlogin.component.scss']
})
export class CardLoginComponent implements OnInit, OnDestroy, IModalInfo {

  public modalDialogTitle: string = 'Akıllı Kart Girişi';
  public modalDialogWidth = 900;
  public modalDialogHeight = 500;

  public formData: any = {
    TerminalName: '',
    PIN: ''
  };

  public terminalList: string[] = [];
  public certificates: Certificate[] = [];
  public errorMessage: string = '';
  public isLoading: boolean = false;
  public selectedCertificate: Certificate = null;

  @ViewChild('dxForm') dxForm: any;
  @ViewChild('list') list: any;

  private subscriptions: Subscription[] = [];

  // Kart kütüphanesi - Turktrust varsayılan
  private selectedDll = 'akisp11.dll';

  constructor(
    private wsEimzaService: WebSocketEimzaService,
    private modalStateService: IModalStateService
  ) {
    console.log('[CardLogin] Component oluşturuldu');
  }

  public setInputParameter(inputParameter: any) {
    // Eğer dışarıdan DLL tipi gönderiliyorsa
    if (inputParameter && inputParameter.dllType) {
      this.selectedDll = inputParameter.dllType;
      console.log('[CardLogin] DLL tipi ayarlandı:', this.selectedDll);
    }
  }

  ngOnInit() {
    console.log('[CardLogin] ngOnInit başladı');
    
    // WebSocket bağlantı durumunu kontrol et
    if (!this.wsEimzaService.isConnected()) {
      this.errorMessage = 'E-İmza uygulamasına bağlanılamadı. Lütfen JNLP uygulamasının çalıştığından emin olun.';
      console.error('[CardLogin] WebSocket bağlantısı yok!');
      return;
    }

    console.log('[CardLogin] WebSocket bağlantısı var, terminal listesi yükleniyor...');

    // Terminal listesini al
    this.loadTerminals();

    // Sertifika listesi güncellemelerini dinle
    const certSub = this.wsEimzaService.certificates$.subscribe(certs => {
      console.log('[CardLogin] Sertifika listesi güncellendi:', certs.length, 'adet');
      this.certificates = certs;
    });

    this.subscriptions.push(certSub);
  }

  ngOnDestroy() {
    console.log('[CardLogin] Component destroy ediliyor');
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Terminal (kart okuyucu) listesini yükler
   */
  private loadTerminals(): void {
    console.log('[CardLogin] Terminal listesi alınıyor...');
    this.isLoading = true;
    this.errorMessage = '';

    this.wsEimzaService.getTerminals().subscribe(
      response => {
        console.log('[CardLogin] Terminal listesi başarıyla alındı');
        this.isLoading = false;
        const terminals = this.wsEimzaService.getCurrentTerminals();
        this.terminalList = terminals.map(t => t.Name);

        console.log('[CardLogin] Terminal sayısı:', this.terminalList.length);

        if (this.terminalList.length > 0) {
          this.formData.TerminalName = this.terminalList[0];
          console.log('[CardLogin] İlk terminal seçildi:', this.formData.TerminalName);
        } else {
          this.errorMessage = 'Kart okuyucu bulunamadı. Lütfen kart okuyucunuzun takılı olduğundan emin olun.';
          console.warn('[CardLogin] Hiç terminal bulunamadı!');
        }
      },
      error => {
        this.isLoading = false;
        this.errorMessage = 'Terminal listesi alınamadı: ' + error.message;
        console.error('[CardLogin] Terminal listesi hatası:', error);
      }
    );
  }

  /**
   * Akıllı karta giriş yapar ve sertifikaları getirir
   */
  doLogin(): void {
    console.log('[CardLogin] doLogin çağrıldı');

    // Form validasyonu
    if (!this.dxForm.instance.validate().isValid) {
      console.warn('[CardLogin] Form validasyonu başarısız');
      return;
    }

    if (!this.formData.TerminalName || !this.formData.PIN) {
      this.errorMessage = 'Lütfen kart okuyucu ve PIN bilgilerini giriniz.';
      console.warn('[CardLogin] Terminal veya PIN boş');
      return;
    }

    console.log('[CardLogin] Login başlatılıyor...');
    console.log('[CardLogin] Terminal:', this.formData.TerminalName);
    console.log('[CardLogin] DLL:', this.selectedDll);

    this.isLoading = true;
    this.errorMessage = '';
    this.certificates = [];

    // Kart kütüphanesini ayarla
    this.wsEimzaService.setCardLibrary(this.selectedDll);

    // 1. Önce kart kütüphanesini gönder
    console.log('[CardLogin] Kart kütüphanesi gönderiliyor:', this.selectedDll);
    this.wsEimzaService.sendCardLibrary(this.selectedDll).subscribe(
      dllResponse => {
        console.log('[CardLogin] Kart kütüphanesi gönderildi');
        
        // 2. Login yap
        console.log('[CardLogin] Login işlemi başlatılıyor...');
        this.wsEimzaService.login(this.formData.TerminalName, this.formData.PIN).subscribe(
          loginResponse => {
            console.log('[CardLogin] Login başarılı');
            
            // 3. Sertifikaları al
            console.log('[CardLogin] Sertifika listesi alınıyor...');
            this.wsEimzaService.getCertificates().subscribe(
              certResponse => {
                this.isLoading = false;
                console.log('[CardLogin] Sertifikalar alındı:', this.certificates.length, 'adet');
                
                if (this.certificates.length === 0) {
                  this.errorMessage = 'Kartınızda sertifika bulunamadı.';
                  console.warn('[CardLogin] Hiç sertifika bulunamadı!');
                } else {
                  this.errorMessage = '';
                  console.log('[CardLogin] ✅ Sertifikalar başarıyla yüklendi');
                }
              },
              certError => {
                this.isLoading = false;
                this.errorMessage = 'Sertifika listesi alınamadı: ' + certError.message;
                console.error('[CardLogin] Sertifika hatası:', certError);
              }
            );
          },
          loginError => {
            this.isLoading = false;
            this.errorMessage = 'Giriş başarısız: ' + loginError.message;
            console.error('[CardLogin] Login hatası:', loginError);
          }
        );
      },
      dllError => {
        this.isLoading = false;
        this.errorMessage = 'Kart kütüphanesi yüklenemedi: ' + dllError.message;
        console.error('[CardLogin] DLL hatası:', dllError);
      }
    );
  }

  /**
   * Sertifika seçer ve modal'ı kapatır
   */
  selectCertificate(list: any): void {
    console.log('[CardLogin] selectCertificate çağrıldı');
    
    const selectedItems = list.selectedItems;

    if (!selectedItems || selectedItems.length === 0) {
      this.errorMessage = 'Lütfen bir sertifika seçiniz.';
      console.warn('[CardLogin] Hiç sertifika seçilmedi');
      return;
    }

    this.selectedCertificate = selectedItems[0] as Certificate;
    console.log('[CardLogin] Sertifika seçildi:', this.selectedCertificate.SubjectCommonName);
    console.log('[CardLogin] Serial Number:', this.selectedCertificate.SerialNumber);

    this.isLoading = true;
    this.errorMessage = '';

    // Seçilen sertifikayı WebSocket'e bildir
    this.wsEimzaService.selectCertificate(this.selectedCertificate.SerialNumber).subscribe(
      response => {
        this.isLoading = false;
        console.log('[CardLogin] ✅ Sertifika başarıyla seçildi');
        
        // Modal'ı kapat ve başarı döndür
        const modalResult = new ModalResult();
        modalResult.dialogResult = DialogResult.OK;
        modalResult.resultValue = {
          certificate: this.selectedCertificate,
          terminal: this.formData.TerminalName
        };
        
        console.log('[CardLogin] Modal kapatılıyor, başarı döndürülüyor');
        this.modalStateService.executeAction(this, modalResult);
      },
      error => {
        this.isLoading = false;
        this.errorMessage = 'Sertifika seçimi başarısız: ' + error.message;
        console.error('[CardLogin] Sertifika seçim hatası:', error);
      }
    );
  }
}
