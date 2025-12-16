import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { IESignatureService } from '../../services/iesignatureservice';
import { IFileUploadService } from '../../services/ifileuploadservice';
import { IModalStateService } from '../../services/imodalstateservice';
import { IModalInfo } from '../../model/imodalinfo';
import { ModalResult } from '../../model/modalresult';
import { DialogResult } from '../../model/dialogresult';
import { map } from 'rxjs/operators';
import { ReportService } from '../../report/services/report.service';
import { Subscription } from 'rxjs';
// WebSocket servisi
import { WebSocketESignatureService } from '../../services/websocket-esignature.service';

@Component({
  selector: 'app-pdfsign',
  templateUrl: './pdfsign.component.html',
  styleUrls: ['./pdfsign.component.scss']
})
export class PdfSignComponent implements OnInit, AfterViewInit, OnDestroy, IModalInfo {

  public modalDialogTitle: string = 'Rapor Pdf İmzalama';
  public modalDialogWidth = 900;
  public modalDialogHeight = 700;
  public errorMessage: string;
  private pdfBytes: Blob;
  private dataId: string;

  @ViewChild('pdfViewer') public pdfViewer;

  // WebSocket için
  public isSigningInProgress: boolean = false;
  public successMessage: string = '';
  public selectedDll: string = 'akisp11.dll';
  
  private subscriptions: Subscription[] = [];
  
  // STATIC: Tüm modaller arasında paylaşılan
  private static wsService: WebSocketESignatureService = null;
  private static isWebSocketConnected: boolean = false;
  private static activeDataId: string = null; // Hangi PDF şu an işlem yapıyor

  constructor(
    private fileUploadService: IFileUploadService,
    private esignatureService: IESignatureService,
    private modalStateService: IModalStateService,
    private wsESignatureService: WebSocketESignatureService
  ) {
    // İlk instance service'i static'e ata
    if (!PdfSignComponent.wsService) {
      PdfSignComponent.wsService = wsESignatureService;
    }
  }

  public setInputParameter(inputParameter: any) {
    this.dataId = inputParameter;
  }

  ngOnInit() {
    // WebSocket mesaj dinleme - sadece bu PDF için
    this.subscriptions.push(
      PdfSignComponent.wsService.getMessages().subscribe(response => {
        // Sadece bu PDF'in işlemi ise mesajları işle
        if (PdfSignComponent.activeDataId === this.dataId) {
          this.handleWebSocketMessage(response);
        }
      })
    );
  }

  ngAfterViewInit() {
    const that = this;
    if (this.dataId) {
      this.downloadFile(this.dataId).subscribe(
        (res) => {
          that.pdfBytes = res;
          that.pdfViewer.pdfSrc = res;
          that.pdfViewer.refresh();
        }
      );
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    // Eğer bu PDF aktifse, aktif PDF'i temizle
    if (PdfSignComponent.activeDataId === this.dataId) {
      PdfSignComponent.activeDataId = null;
    }
  }

  private downloadFile(dataId: string): any {
    const input = { dataId: dataId, mimeType: "application/pdf" };
    return this.fileUploadService.downloadBinaryData(input.dataId, input.mimeType).pipe(
      map((result: any) => {
        return new Blob([result.body]);
      })
    );
  }

  private b64toBlob(b64Data, contentType = '', sliceSize = 512) {
    const byteCharacters = atob(b64Data);
    let byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: contentType });
    return blob;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64 = base64String.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ============ ESKİ METOD (İSTERSENİZ KULLANIN) ============
  onSignPdfOld() {
    const that = this;
    this.esignatureService.showLoginModal().then(r => {
      that.esignatureService.signPdf(this.pdfBytes).subscribe(r => {
        const formData = new FormData();
        const byteCharacters = that.b64toBlob(r.Result.PdfBytes, 'application/pdf');
        formData.append('PdfBytes', byteCharacters);
        that.fileUploadService.uploadFile(formData).subscribe(upres => {
          const modalResult = new ModalResult();
          modalResult.dialogResult = DialogResult.OK;
          modalResult.resultValue = upres;
          that.modalStateService.executeAction(this, modalResult);
        }, err => {
          that.errorMessage = err.error.Message;
        })
      }, err => {
        that.errorMessage = err.error.Message;
      });
    });
  }

  // ============ YENİ METOD: WebSocket ile İmzalama ============
  async onSignPdf() {
    const that = this;

    // PDF hazır mı?
    if (!this.pdfBytes) {
      this.errorMessage = 'PDF yüklenmedi';
      return;
    }

    // Bu PDF artık aktif
    PdfSignComponent.activeDataId = this.dataId;

    // İmzalama başlat
    this.isSigningInProgress = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // WebSocket bağlantısını kontrol et/kur
      if (!PdfSignComponent.isWebSocketConnected) {
        console.log(`🔌 İLK PDF (${this.dataId}) - WebSocket bağlantısı kuruluyor...`);
        console.log('🔐 TurkTrust sertifika seçimi ve PIN ekranı açılacak...');
        
        const connected = await PdfSignComponent.wsService.connectAsync('angular_user_' + Date.now());
        
        if (!connected) {
          throw new Error('WebSocket bağlantısı kurulamadı. TurkTrust istemci uygulamasının çalıştığından emin olun.');
        }

        PdfSignComponent.isWebSocketConnected = true;
        console.log('✅ WebSocket bağlantısı başarılı');
      } else {
        console.log(`✅ SONRAKI PDF (${this.dataId}) - Mevcut WebSocket bağlantısı kullanılıyor (PIN istenmeyecek)`);
      }

      // PDF'i base64'e çevir
      const pdfBase64 = await this.blobToBase64(this.pdfBytes);
      console.log(`📄 PDF base64'e çevrildi (DataId: ${this.dataId})`);

      // Kart kütüphanesini gönder
      PdfSignComponent.wsService.sendCardType(this.selectedDll);

      // PDF'i imzalat
      setTimeout(() => {
        PdfSignComponent.wsService.signWithCAdESUI(pdfBase64, false);
        console.log(`📝 PDF imzalama isteği gönderildi (DataId: ${that.dataId})`);
      }, 500);

    } catch (error) {
      console.error('❌ İmzalama hatası:', error);
      this.errorMessage = error.message || 'İmzalama işlemi başarısız';
      this.isSigningInProgress = false;
      
      // Hata durumunda bağlantıyı sıfırla
      PdfSignComponent.isWebSocketConnected = false;
      PdfSignComponent.activeDataId = null;
      PdfSignComponent.wsService.disconnect();
    }
  }

  // ============ WebSocket mesajlarını işle ============
  private handleWebSocketMessage(response: any) {
    console.log(`📨 WebSocket yanıtı alındı (DataId: ${this.dataId}, İşlem: ${response.islemId})`);

    // Hata kontrolü
    if (response.hataMesaji) {
      this.errorMessage = response.hataMesaji;
      this.isSigningInProgress = false;
      
      // Hata durumunda bağlantıyı sıfırla
      PdfSignComponent.isWebSocketConnected = false;
      PdfSignComponent.activeDataId = null;
      PdfSignComponent.wsService.disconnect();
      return;
    }

    // İmzalama yanıtı (islemId: "12" veya "2")
    if (response.islemId === '12' || response.islemId === '2') {
      this.handleSignResponse(response);
    }
  }

  // ============ İmza yanıtı - İmzalı PDF'i işle ============
  private handleSignResponse(response: any) {
    const that = this;

    if (response.data) {
      const signedPdfBase64 = response.data;
      console.log(`✅ İmzalı PDF alındı (DataId: ${this.dataId}, Uzunluk: ${signedPdfBase64.length})`);
      
      try {
        // Backend'e gönder
        const formData = new FormData();
        const blob = that.b64toBlob(signedPdfBase64, 'application/pdf');
        formData.append('PdfBytes', blob);
        
        console.log(`📤 Backend'e yükleniyor (DataId: ${this.dataId})...`);
        
        that.fileUploadService.uploadFile(formData).subscribe(
          upres => {
            that.successMessage = 'PDF başarıyla imzalandı ve yüklendi';
            that.isSigningInProgress = false;
            
            console.log(`✅ PDF backend'e yüklendi (DataId: ${that.dataId})`);
            console.log(`🔓 Modal kapanacak, WebSocket açık kalacak`);
            
            // Bu PDF artık aktif değil
            PdfSignComponent.activeDataId = null;
            
            // Modal'ı kapat
            setTimeout(() => {
              const modalResult = new ModalResult();
              modalResult.dialogResult = DialogResult.OK;
              modalResult.resultValue = upres;
              that.modalStateService.executeAction(this, modalResult);
            }, 500);
          },
          err => {
            that.errorMessage = err.error && err.error.Message ? err.error.Message : 'Dosya yükleme hatası';
            that.isSigningInProgress = false;
            PdfSignComponent.activeDataId = null;
          }
        );
      } catch (error) {
        that.errorMessage = 'İmzalı dosya işlenirken hata oluştu: ' + error.message;
        that.isSigningInProgress = false;
        PdfSignComponent.activeDataId = null;
      }
    } else {
      this.errorMessage = 'İmzalanmış veri alınamadı';
      this.isSigningInProgress = false;
      PdfSignComponent.activeDataId = null;
    }
  }

  onCancel() {
    // İptal - Aktif PDF'i temizle
    if (PdfSignComponent.activeDataId === this.dataId) {
      PdfSignComponent.activeDataId = null;
    }
    
    const modalResult = new ModalResult();
    modalResult.dialogResult = DialogResult.CANCEL;
    this.modalStateService.executeAction(this, modalResult);
  }

}
