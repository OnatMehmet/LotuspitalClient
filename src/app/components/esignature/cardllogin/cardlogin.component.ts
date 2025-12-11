import { Component, OnInit, EventEmitter, Output, ViewChild, OnDestroy } from '@angular/core';
import { DxListComponent } from 'devextreme-angular';
import { ModalResult } from '../../model/modalresult';
import { DialogResult } from '../../model/dialogresult';
import { IModalInfo } from '../../model/imodalinfo';
import { IModalStateService } from '../../services/imodalstateservice';
import { SmartCardLogin } from '../../model/smartcardlogin';
import { WebSocketEimzaService, Certificate } from '../services/websocket-eimza.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'mskbs-smart-card',
    templateUrl: './cardlogin.component.html',
    styleUrls: ['./cardlogin.component.scss']
})
export class CardLoginComponent implements OnInit, OnDestroy, IModalInfo {

    public modalDialogTitle: string = 'Akıllı Kart Giriş';
    public modalDialogWidth = 900;
    public modalDialogHeight = 500;
    
    public formData: SmartCardLogin;
    public terminalList: Array<string> = new Array<string>();
    public certificates: Certificate[] = [];
    public errorMessage: string = '';

    @ViewChild('dxForm') dxForm: any;

    @Output() loginCompleted: EventEmitter<SmartCardLogin> = new EventEmitter<SmartCardLogin>();
    @Output() loginFailed: EventEmitter<string> = new EventEmitter<string>();
    @Output() certificateSelected: EventEmitter<any> = new EventEmitter<any>();
    @Output() certificateSelectFailed: EventEmitter<any> = new EventEmitter<any>();

    private subscriptions: Subscription[] = [];
    
    // Kart kütüphanesi - Turktrust varsayılan
    private selectedDll = 'akisp11.dll';

    constructor(
        private wsEimzaService: WebSocketEimzaService,
        private modalStateService: IModalStateService
    ) {
        console.log('[CardLogin] Component oluşturuldu');
        this.formData = new SmartCardLogin();
        this.formData.TerminalName = '';
        this.formData.PIN = '';
    }

    /**
     * Dışarıdan parametre alır (opsiyonel)
     */
    public setInputParameter(inputParameter: any) {
        if (inputParameter && inputParameter.dllType) {
            this.selectedDll = inputParameter.dllType;
            console.log('[CardLogin] DLL tipi ayarlandı:', this.selectedDll);
        }
    }

    /**
     * Component başlatma
     */
    public ngOnInit(): void {
        console.log('[CardLogin] ngOnInit başladı');

        // WebSocket bağlantı kontrolü
        if (!this.wsEimzaService.isConnected()) {
            this.errorMessage = 'E-İmza uygulamasına bağlanılamadı. Lütfen JNLP uygulamasının çalıştığından emin olun.';
            console.error('[CardLogin] ❌ WebSocket bağlantısı yok!');
            return;
        }

        console.log('[CardLogin] ✅ WebSocket bağlantısı var');

        // Terminal listesini al
        this.loadTerminals();

        // Sertifika listesi güncellemelerini dinle
        const certSub = this.wsEimzaService.certificates$.subscribe(certs => {
            console.log('[CardLogin] Sertifika listesi güncellendi:', certs.length, 'adet');
            this.certificates = certs;
        });

        this.subscriptions.push(certSub);
    }

    /**
     * Component temizleme
     */
    ngOnDestroy() {
        console.log('[CardLogin] Component destroy ediliyor');
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    /**
     * Terminal (kart okuyucu) listesini yükler
     */
    private loadTerminals(): void {
        console.log('[CardLogin] Terminal listesi alınıyor...');
        this.errorMessage = '';

        this.wsEimzaService.getTerminals().subscribe(
            response => {
                console.log('[CardLogin] ✅ Terminal listesi başarıyla alındı');
                const terminals = this.wsEimzaService.getCurrentTerminals();
                this.terminalList = terminals.map(t => t.Name);

                console.log('[CardLogin] Terminal sayısı:', this.terminalList.length);

                if (this.terminalList.length > 0) {
                    this.formData.TerminalName = this.terminalList[0];
                    console.log('[CardLogin] İlk terminal otomatik seçildi:', this.formData.TerminalName);
                } else {
                    this.errorMessage = 'Kart okuyucu bulunamadı. Lütfen kart okuyucunuzun takılı olduğundan emin olun.';
                    console.warn('[CardLogin] ⚠️ Hiç terminal bulunamadı!');
                }
            },
            error => {
                this.errorMessage = 'Terminal listesi alınamadı: ' + this.extractErrorMessage(error);
                console.error('[CardLogin] ❌ Terminal listesi hatası:', error);
            }
        );
    }

    /**
     * Akıllı karta giriş yapar ve sertifikaları getirir
     * "Akıllı Kart Giriş" butonuna basıldığında çalışır
     */
    public doLogin(): void {
        console.log('[CardLogin] doLogin() çağrıldı');

        // Form validasyonu
        if (this.dxForm && !this.dxForm.instance.validate().isValid) {
            console.warn('[CardLogin] ⚠️ Form validasyonu başarısız');
            return;
        }

        if (!this.formData.TerminalName || !this.formData.PIN) {
            this.errorMessage = 'Lütfen kart okuyucu ve PIN bilgilerini giriniz.';
            console.warn('[CardLogin] ⚠️ Terminal veya PIN boş');
            return;
        }

        console.log('[CardLogin] Login başlatılıyor...');
        console.log('[CardLogin] Terminal:', this.formData.TerminalName);
        console.log('[CardLogin] DLL:', this.selectedDll);

        this.errorMessage = '';
        this.certificates = []; // Eski sertifikaları temizle

        // Kart kütüphanesini ayarla
        this.wsEimzaService.setCardLibrary(this.selectedDll);

        // Adım 1: Kart kütüphanesini gönder
        console.log('[CardLogin] 1/3 - Kart kütüphanesi gönderiliyor...');
        this.wsEimzaService.sendCardLibrary(this.selectedDll).subscribe(
            dllResponse => {
                console.log('[CardLogin] ✅ Kart kütüphanesi gönderildi');
                
                // Adım 2: Login yap
                console.log('[CardLogin] 2/3 - Login işlemi başlatılıyor...');
                this.wsEimzaService.login(this.formData.TerminalName, this.formData.PIN).subscribe(
                    loginResponse => {
                        console.log('[CardLogin] ✅ Login başarılı');
                        this.loginCompleted.emit(this.formData);
                        
                        // Adım 3: Sertifikaları al
                        console.log('[CardLogin] 3/3 - Sertifika listesi alınıyor...');
                        this.wsEimzaService.getCertificates().subscribe(
                            certResponse => {
                                console.log('[CardLogin] ✅ Sertifikalar başarıyla alındı');
                                console.log('[CardLogin] Sertifika sayısı:', this.certificates.length);
                                
                                if (this.certificates.length === 0) {
                                    this.errorMessage = 'Kartınızda sertifika bulunamadı.';
                                    console.warn('[CardLogin] ⚠️ Hiç sertifika yok!');
                                } else {
                                    console.log('[CardLogin] 🎉 Sertifikalar sağ tarafta gösteriliyor');
                                }
                            },
                            certError => {
                                this.errorMessage = 'Sertifika listesi alınamadı: ' + this.extractErrorMessage(certError);
                                console.error('[CardLogin] ❌ Sertifika hatası:', certError);
                            }
                        );
                    },
                    loginError => {
                        this.errorMessage = 'Giriş başarısız: ' + this.extractErrorMessage(loginError);
                        this.loginFailed.emit(this.extractErrorMessage(loginError));
                        console.error('[CardLogin] ❌ Login hatası:', loginError);
                    }
                );
            },
            dllError => {
                this.errorMessage = 'Kart kütüphanesi yüklenemedi: ' + this.extractErrorMessage(dllError);
                console.error('[CardLogin] ❌ DLL hatası:', dllError);
            }
        );
    }

    /**
     * Sertifika seçer ve modal'ı kapatır
     * "Sertifika Seç" butonuna basıldığında çalışır
     */
    public selectCertificate(list: DxListComponent): void {
        console.log('[CardLogin] selectCertificate() çağrıldı');
        
        // Sertifika seçilmiş mi kontrol et
        if (!list.selectedItems || list.selectedItems.length === 0) {
            this.errorMessage = 'Lütfen bir sertifika seçiniz.';
            console.warn('[CardLogin] ⚠️ Hiç sertifika seçilmedi');
            return;
        }

        const selectedCertificate = list.selectedItems[0] as Certificate;
        console.log('[CardLogin] Sertifika seçildi:', selectedCertificate.SubjectCommonName);
        console.log('[CardLogin] Serial Number:', selectedCertificate.SerialNumber);

        this.errorMessage = '';

        // Seçilen sertifikayı WebSocket'e bildir
        console.log('[CardLogin] Sertifika seçimi WebSocket\'e bildiriliyor...');
        this.wsEimzaService.selectCertificate(selectedCertificate.SerialNumber).subscribe(
            response => {
                console.log('[CardLogin] ✅ Sertifika başarıyla seçildi');
                
                // Event'leri tetikle
                this.certificateSelected.emit(selectedCertificate);
                
                // Modal'ı kapat ve başarı döndür
                const modalResult: ModalResult = new ModalResult();
                modalResult.dialogResult = DialogResult.OK;
                modalResult.resultValue = {
                    certificate: selectedCertificate,
                    terminal: this.formData.TerminalName
                };
                
                console.log('[CardLogin] Modal kapatılıyor - Başarı döndürülüyor');
                console.log('[CardLogin] Dönen değer:', modalResult.resultValue);
                this.modalStateService.executeAction(this, modalResult);
            },
            error => {
                this.errorMessage = 'Sertifika seçimi başarısız: ' + this.extractErrorMessage(error);
                this.certificateSelectFailed.emit(error);
                console.error('[CardLogin] ❌ Sertifika seçim hatası:', error);
            }
        );
    }

    /**
     * Hata mesajını düzenler
     */
    private extractErrorMessage(err: any): string {
        if ((typeof err) === 'string') {
            return err as string;
        }

        if (err && err.message) {
            return err.message;
        }

        if (typeof err.json === 'function') {
            let json = err.json();
            return json.message || json.Message || 'Bilinmeyen hata';
        }

        return err ? err.toString() : 'Bilinmeyen hata';
    }
}