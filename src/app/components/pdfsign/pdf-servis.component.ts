import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { WebSocketEimzaService } from '../services/websocket-eimza.service';
import { IFileUploadService } from '../../services/ifileuploadservice';
import { IModalStateService } from '../../services/imodalstateservice';
import { IModalDialogService } from '../../services/imodaldialogservice';
import { IModalInfo } from '../../model/imodalinfo';
import { ModalResult } from '../../model/modalresult';
import { DialogResult } from '../../model/dialogresult';
import { CardLoginComponent } from '../cardlogin/cardlogin.component';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-pdfsign',
  templateUrl: './pdfsign.component.html',
  styleUrls: ['./pdfsign.component.scss']
})
export class PdfSignComponent implements OnInit, AfterViewInit, IModalInfo {

  public modalDialogTitle: string = 'Rapor Pdf İmzalama';
  public modalDialogWidth = 800;
  public modalDialogHeight = 600;
  public errorMessage: string = '';
  
  private pdfBytes: Blob;
  private dataId: string;
  
  // İmzalama durumu (HTML'de kullanılmıyor ama isterseniz ekleyebilirsiniz)
  public isSigning: boolean = false;

  @ViewChild('pdfViewer') public pdfViewer;

  constructor(
    private fileUploadService: IFileUploadService,
    private wsEimzaService: WebSocketEimzaService,
    private modalStateService: IModalStateService,
    private modalDialogService: IModalDialogService
  ) {
    console.log('[PdfSign] Component oluşturuldu');
  }

  public setInputParameter(inputParameter: any) {
    this.dataId = inputParameter;
    console.log('[PdfSign] Data ID ayarlandı:', this.dataId);
  }

  ngOnInit() {
    console.log('[PdfSign] ngOnInit');
  }

  ngAfterViewInit() {
    console.log('[PdfSign] ngAfterViewInit - PDF yükleniyor...');
    const that = this;
    
    if (this.dataId) {
      this.downloadFile(this.dataId).subscribe(
        (res) => {
          console.log('[PdfSign] PDF başarıyla yüklendi');
          that.pdfBytes = res;
          that.pdfViewer.pdfSrc = res;
          that.pdfViewer.refresh();
        },
        (error) => {
          console.error('[PdfSign] PDF yükleme hatası:', error);
          that.errorMessage = 'PDF yüklenirken hata oluştu: ' + error.message;
        }
      );
    } else {
      console.warn('[PdfSign] Data ID yok!');
    }
  }

  /**
   * PDF dosyasını indirir
   */
  private downloadFile(dataId: string): any {
    const input = { dataId: dataId, mimeType: "application/pdf" };
    return this.fileUploadService.downloadBinaryData(input.dataId, input.mimeType).pipe(
      map((result: any) => {
        return new Blob([result.body]);
      })
    );
  }

  /**
   * Base64'ü Blob'a çevirir
   */
  private b64toBlob(b64Data: string, contentType: string = '', sliceSize: number = 512): Blob {
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

  /**
   * PDF İmzalama İşlemi - WEBSOCKET SİSTEMİ
   */
  onSignPdf(): void {
    console.log('[PdfSign] onSignPdf çağrıldı');
    const that = this;

    // WebSocket bağlantısı kontrolü
    if (!this.wsEimzaService.isConnected()) {
      this.errorMessage = 'E-İmza uygulamasına bağlanılamadı. Lütfen JNLP uygulamasının çalıştığından emin olun.';
      console.error('[PdfSign] WebSocket bağlantısı yok!');
      return;
    }

    // PDF yüklü mü kontrol et
    if (!this.pdfBytes) {
      this.errorMessage = 'PDF yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.';
      console.error('[PdfSign] PDF bytes yok!');
      return;
    }

    console.log('[PdfSign] CardLogin modal açılıyor...');
    this.isSigning = true;
    this.errorMessage = '';

    // 1. CardLogin modalını aç (sertifika seçimi + PIN girişi)
    this.modalDialogService.showModal(CardLoginComponent).then(
      (loginResult: ModalResult) => {
        console.log('[PdfSign] CardLogin modal sonucu:', loginResult.dialogResult);
        
        if (loginResult.dialogResult !== DialogResult.OK) {
          that.isSigning = false;
          that.errorMessage = 'Sertifika seçimi iptal edildi.';
          console.warn('[PdfSign] Sertifika seçimi iptal edildi');
          return;
        }

        console.log('[PdfSign] Sertifika seçildi:', loginResult.resultValue);
        console.log('[PdfSign] PDF imzalama başlatılıyor...');

        // 2. PDF'i imzala
        that.signPdfWithWebSocket();
      },
      (loginError) => {
        that.isSigning = false;
        that.errorMessage = 'Sertifika seçimi sırasında hata oluştu.';
        console.error('[PdfSign] Login modal hatası:', loginError);
      }
    );
  }

  /**
   * WebSocket ile PDF imzalama
   */
  private signPdfWithWebSocket(): void {
    console.log('[PdfSign] signPdfWithWebSocket başladı');
    const that = this;

    this.wsEimzaService.signPdf(this.pdfBytes).subscribe(
      (signedBase64: string) => {
        console.log('[PdfSign] ✅ PDF başarıyla imzalandı');
        console.log('[PdfSign] İmzalı PDF sunucuya yükleniyor...');
        
        // 3. İmzalı PDF'i Blob'a çevir ve sunucuya yükle
        const formData = new FormData();
        const signedBlob = that.b64toBlob(signedBase64, 'application/pdf');
        formData.append('PdfBytes', signedBlob);

        that.fileUploadService.uploadFile(formData).subscribe(
          (uploadResult) => {
            that.isSigning = false;
            console.log('[PdfSign] ✅ İmzalı PDF sunucuya yüklendi');

            // 4. Modal'ı kapat ve sonucu döndür
            const modalResult = new ModalResult();
            modalResult.dialogResult = DialogResult.OK;
            modalResult.resultValue = uploadResult;
            
            console.log('[PdfSign] Modal kapatılıyor, başarı döndürülüyor');
            that.modalStateService.executeAction(this, modalResult);
          },
          (uploadError) => {
            that.isSigning = false;
            that.errorMessage = 'İmzalı PDF yüklenirken hata oluştu: ' + 
              (uploadError.error?.Message || uploadError.message);
            console.error('[PdfSign] Upload hatası:', uploadError);
          }
        );
      },
      (signError) => {
        that.isSigning = false;
        that.errorMessage = 'PDF imzalama hatası: ' + signError.message;
        console.error('[PdfSign] İmzalama hatası:', signError);
      }
    );
  }

  /**
   * İptal butonu
   */
  onCancel(): void {
    console.log('[PdfSign] İptal edildi');
    const modalResult = new ModalResult();
    modalResult.dialogResult = DialogResult.CANCEL;
    this.modalStateService.executeAction(this, modalResult);
  }
}
