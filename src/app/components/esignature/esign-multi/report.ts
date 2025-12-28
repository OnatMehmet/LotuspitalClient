import { Component, OnInit } from '@angular/core';
import { RaporOzet } from '../../apimodel/raporozet';
import { IMessageService } from '../../services/imessageservice';
import { IFileUploadService } from '../../services/ifileuploadservice';
import { WebSocketESignatureService } from '../../services/websocket-esignature.service';

@Component({
  selector: 'app-query-report',
  templateUrl: './query-report.component.html',
  styleUrls: ['./query-report.component.scss']
})
export class QueryReportComponent implements OnInit {

  // Rapor listesi
  public selectedReports: RaporOzet[] = [];
  
  // PDF popup görünürlüğü
  public isPdfPopupVisible: boolean = false;
  
  // PDF inceleme için gönderilecek model (sadece validasyonu geçenler)
  public viewModel: RaporOzet[] = [];
  
  // İmzalama durumu
  public isSigningInProgress: boolean = false;
  public signingProgress: string = '';
  public canSign: boolean = false;

  constructor(
    private messageService: IMessageService,
    private fileUploadService: IFileUploadService,
    private wsESignatureService: WebSocketESignatureService
  ) { }

  ngOnInit() {
    // TODO: Raporları yükle
    // this.loadReports();
  }

  /**
   * PDF Aç butonu - Validasyon yap ve popup'ta göster
   */
  openPdf() {
    const that = this;
    
    // Seçili raporları filtrele
    const selectedGridItems = this.selectedReports.filter(x => x.secili === true);

    if (selectedGridItems.length === 0) {
      this.messageService.showError('Rapor seçmeden işleme devam edilemiyor.');
      return;
    }

    console.log('📋 PDF Aç: ' + selectedGridItems.length + ' rapor seçildi');

    // Validasyon yap
    const validationResult = this.validateReports(selectedGridItems);

    // Validasyonu geçemeyen raporlar var mı?
    if (validationResult.invalidReports.length > 0) {
      const invalidCount = validationResult.invalidReports.length;
      const validCount = validationResult.validReports.length;
      const totalCount = selectedGridItems.length;

      // Validasyonu geçemeyen rapor numaralarını listele
      const invalidReportNumbers = validationResult.invalidReports
        .map(r => r.raporKayitNo)
        .join(', ');

      // Validasyonu geçemeyen raporların tikini kaldır
      validationResult.invalidReports.forEach(invalidReport => {
        const report = that.selectedReports.find(r => r.raporKayitNo === invalidReport.raporKayitNo);
        if (report) {
          report.secili = false;
        }
      });

      // Kullanıcıya detaylı bilgi ver
      let errorMessage = 
        'Toplam ' + totalCount + ' rapor seçildi.\n' +
        '✅ ' + validCount + ' rapor açılacak\n' +
        '❌ ' + invalidCount + ' rapor açılamıyor (Durum: Yeni)\n\n' +
        'Açılamayan raporlar: ' + invalidReportNumbers;

      this.messageService.showError(errorMessage);
      
      console.log('❌ Validasyon geçemeyen raporlar:', invalidReportNumbers);
      console.log('✅ Validasyonu geçen raporlar:', validCount);

      // Eğer hiç geçerli rapor yoksa, işlemi durdur
      if (validCount === 0) {
        return;
      }
    }

    // Sadece validasyonu geçenleri gönder
    this.viewModel = [...validationResult.validReports];
    this.isPdfPopupVisible = true;
    this.canSign = false;

    console.log('✅ Popup açılıyor: ' + this.viewModel.length + ' rapor');
  }

  /**
   * Raporları validate et
   * @returns {validReports, invalidReports}
   */
  private validateReports(reports: RaporOzet[]): { validReports: RaporOzet[], invalidReports: RaporOzet[] } {
    const validReports: RaporOzet[] = [];
    const invalidReports: RaporOzet[] = [];

    reports.forEach(report => {
      // VALİDASYON KURALI: Durumu "Yeni" OLMAYAN raporlar açılabilir
      // TODO: Sizin validasyon kuralınıza göre düzenleyin
      
      if (this.isReportValid(report)) {
        validReports.push(report);
      } else {
        invalidReports.push(report);
      }
    });

    return { validReports, invalidReports };
  }

  /**
   * Tekil rapor validasyonu
   */
  private isReportValid(report: RaporOzet): boolean {
    // Kural 1: Durum kontrolü
    if (report.durumu === 'Yeni' || report.durumu === 'NEW' || report.durumu === 'YENI') {
      console.log('❌ Validasyon geçmedi:', report.raporKayitNo, '- Durum: Yeni');
      return false;
    }

    // Kural 2: PDF var mı?
    if (!report.raporPdfKayitNo) {
      console.log('❌ Validasyon geçmedi:', report.raporKayitNo, '- PDF yok');
      return false;
    }

    // TODO: Diğer validasyon kurallarınızı ekleyin
    // Örnek: Zeyil kontrolü
    // if (report.zeyilSebebi) {
    //   console.log('❌ Validasyon geçmedi:', report.raporKayitNo, '- Zeyil var');
    //   return false;
    // }

    return true;
  }

  /**
   * PDF inceleme tamamlandı - Popup'tan dönen sonuç
   */
  onPdfFinished(reports: RaporOzet[]) {
    const that = this;
    console.log('📊 PDF inceleme tamamlandı, sonuçlar alındı:', reports.length);

    // Dönen sonuçlarla mevcut listeyi güncelle
    reports.forEach(returnedReport => {
      const existingReport = that.selectedReports.find(r => r.raporKayitNo === returnedReport.raporKayitNo);
      
      if (existingReport) {
        // Secili durumunu güncelle
        existingReport.secili = returnedReport.secili;
      }
    });

    // Kaç rapor onaylandı?
    const approvedCount = this.selectedReports.filter(r => r.secili === true).length;
    const rejectedCount = reports.filter(r => r.secili === false).length;

    console.log('✅ Kaydet: ' + approvedCount);
    console.log('❌ Vazgeç: ' + rejectedCount);

    // Popup'ı kapat
    this.isPdfPopupVisible = false;

    // Eğer onaylanan rapor varsa, imzalama butonu aktif
    this.canSign = approvedCount > 0;

    if (approvedCount > 0) {
      let message = approvedCount + ' rapor kaydedildi.';
      if (rejectedCount > 0) {
        message += ' ' + rejectedCount + ' rapor vazgeçildi.';
      }
      message += ' "İmzala" butonuna tıklayarak imzalayabilirsiniz.';
      
      this.messageService.showSuccess(message);
    } else {
      this.messageService.showWarning('Hiçbir rapor kaydedilmedi.');
    }
  }

  /**
   * İmzala butonu - Onaylanan raporları toplu imzala
   */
  async onSign() {
    const that = this;
    
    // Sadece secili: true olanları al
    const approvedReports = this.selectedReports.filter(r => r.secili === true);

    if (approvedReports.length === 0) {
      this.messageService.showError('Onaylanmış rapor yok');
      return;
    }

    console.log('🔐 İmzalama başlıyor: ' + approvedReports.length + ' rapor');

    this.isSigningInProgress = true;
    this.signingProgress = 'WebSocket bağlantısı kuruluyor...';

    try {
      // 1. WebSocket bağlantısı kur
      const connected = await this.wsESignatureService.connectAsync('angular_user_' + Date.now());
      
      if (!connected) {
        throw new Error('WebSocket bağlantısı kurulamadı');
      }

      console.log('✅ WebSocket bağlandı');

      // 2. PDF'leri base64'e çevir
      that.signingProgress = approvedReports.length + ' PDF base64\'e çevriliyor...';
      console.log('📄 PDF\'ler base64\'e çevriliyor...');
      
      const pdfBase64Array: string[] = [];
      
      for (let i = 0; i < approvedReports.length; i++) {
        const report = approvedReports[i];
        const blob = await that.downloadPdfAsBlob(report.raporPdfKayitNo);
        const base64 = await that.blobToBase64(blob);
        pdfBase64Array.push(base64);
      }

      // 3. PDF'leri ; ile birleştir
      const combinedPdfBase64 = pdfBase64Array.join(';');
      console.log('📦 ' + pdfBase64Array.length + ' PDF birleştirildi, toplam uzunluk: ' + combinedPdfBase64.length);

      // 4. Kart kütüphanesini gönder
      this.wsESignatureService.sendCardType('akisp11.dll');

      // 5. İmzalama isteği gönder
      that.signingProgress = 'PDF\'ler imzalanıyor... (Lütfen PIN giriniz)';
      console.log('🔐 İmzalama başlatılıyor...');
      
      const signedData = await that.waitForSignature(combinedPdfBase64);

      // 6. İmzalı veriyi ayır
      const signedPdfArray = signedData.split(';');
      console.log('✅ ' + signedPdfArray.length + ' imzalı PDF alındı');

      if (signedPdfArray.length !== approvedReports.length) {
        throw new Error('İmzalı PDF sayısı eşleşmiyor: ' + signedPdfArray.length + ' !== ' + approvedReports.length);
      }

      // 7. Her imzalı PDF'i ilgili raporla eşleştir ve backend'e gönder
      that.signingProgress = 'İmzalı PDF\'ler sunucuya yükleniyor...';
      await that.uploadSignedPdfs(approvedReports, signedPdfArray);

      // 8. Başarılı
      that.isSigningInProgress = false;
      that.canSign = false;
      that.messageService.showSuccess(approvedReports.length + ' PDF başarıyla imzalandı ve yüklendi!');
      console.log('🎉 Tüm işlemler tamamlandı!');

      // WebSocket'i kapat
      that.wsESignatureService.disconnect();

      // Seçimleri temizle
      that.selectedReports.forEach(r => r.secili = false);

    } catch (error) {
      console.error('❌ İmzalama hatası:', error);
      that.messageService.showError(error.message || 'İmzalama işlemi başarısız');
      that.isSigningInProgress = false;
      that.wsESignatureService.disconnect();
    }
  }

  /**
   * PDF'i Blob olarak indir
   */
  private downloadPdfAsBlob(pdfBinaryDataId: string): Promise<Blob> {
    const that = this;
    
    return new Promise((resolve, reject) => {
      const input = { dataId: pdfBinaryDataId, mimeType: 'application/pdf' };
      
      that.fileUploadService.downloadBinaryData(input.dataId, input.mimeType)
        .subscribe(
          (result: any) => {
            const blob = new Blob([result.body]);
            resolve(blob);
          },
          (error) => {
            reject(error);
          }
        );
    });
  }

  /**
   * İmza yanıtını bekle
   */
  private waitForSignature(pdfBase64: string): Promise<string> {
    const that = this;
    
    return new Promise((resolve, reject) => {
      const subscription = that.wsESignatureService.getMessages().subscribe(
        (response) => {
          if (response.hataMesaji) {
            subscription.unsubscribe();
            reject(new Error(response.hataMesaji));
          } else if (response.islemId === '12' || response.islemId === '2') {
            subscription.unsubscribe();
            resolve(response.data);
          }
        },
        (error) => {
          subscription.unsubscribe();
          reject(error);
        }
      );

      // İmzalama isteğini gönder
      setTimeout(() => {
        that.wsESignatureService.signWithCAdESUI(pdfBase64, false);
      }, 500);

      // 60 saniye timeout
      setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error('İmzalama zaman aşımına uğradı (60 saniye)'));
      }, 60000);
    });
  }

  /**
   * İmzalı PDF'leri sunucuya yükle
   */
  private async uploadSignedPdfs(reports: RaporOzet[], signedPdfArray: string[]): Promise<void> {
    const that = this;
    console.log('📤 ' + reports.length + ' imzalı PDF sunucuya yükleniyor...');
    
    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      const signedPdfBase64 = signedPdfArray[i];
      
      that.signingProgress = 'Yükleniyor: ' + (i + 1) + '/' + reports.length + ' - ' + report.raporKayitNo;
      
      const formData = new FormData();
      const blob = that.b64toBlob(signedPdfBase64, 'application/pdf');
      formData.append('PdfBytes', blob);
      formData.append('RaporKayitNo', report.raporKayitNo);
      formData.append('RaporPdfKayitNo', report.raporPdfKayitNo);
      
      await that.fileUploadService.uploadFile(formData).toPromise();
      console.log('✅ ' + report.raporKayitNo + ' yüklendi');
    }
    
    console.log('✅ Tüm PDF\'ler yüklendi');
  }

  // Yardımcı metodlar
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

  private b64toBlob(b64Data: string, contentType: string = '', sliceSize: number = 512): Blob {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: contentType });
  }

}