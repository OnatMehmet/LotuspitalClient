import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})

export class NavbarComponent {

  // Accordion'da hangi menünün aktif olduğunu takip eden değişken
  activeIndex: number | null = null;

  // Menu'yu aktif etme fonksiyonu
  toggleAccordion(index: number) {
    if (this.activeIndex === index) {
      this.activeIndex = null; // Aynı menüye tıklanırsa kapanır
    } else {
      this.activeIndex = index; // Yeni menü açılır
    }
  }
  constructor(
    private router : Router
  ){}
  
  // Dropdown menüsünü açıp kapatma fonksiyonu
  isDropdownOpen = false;  // Dropdown menüsünün açık olup olmadığını takip eder
  isDropdownOpenHasta = false;  // Dropdown menüsünün açık olup olmadığını takip eder
  isDropdownOpenRandevu = false;  
  isDropdownOpenSatis = false;
  isDropdownOpenTanimlamalar = false;  
  isDropdownOpenSidebar = false;

  // Sidebar toggle function
  toggleSidebar() {
    this.isDropdownOpenSidebar = !this.isDropdownOpenSidebar;
  }
  // Toggle function to control which dropdown is open
  toggleDropdown(menu: string) {
    if (menu === 'hasta') {
      this.isDropdownOpenHasta = !this.isDropdownOpenHasta;
      if (this.isDropdownOpenHasta) {
        // Automatically close other menu
        this.isDropdownOpenRandevu = false;
        this.isDropdownOpenTanimlamalar = false;
        this.isDropdownOpenSatis = false;
        this.isDropdownOpenSidebar = false;
      }
    } else if (menu === 'randevu') {
      this.isDropdownOpenRandevu = !this.isDropdownOpenRandevu;
      if (this.isDropdownOpenRandevu) {
        // Automatically close other menu
        this.isDropdownOpenHasta = false;
        this.isDropdownOpenTanimlamalar = false;
        this.isDropdownOpenSatis = false;
        this.isDropdownOpenSidebar = false;
      }
    }else if (menu === 'satis') {
      this.isDropdownOpenSatis = !this.isDropdownOpenSatis;
      if (this.isDropdownOpenSatis) {
        // Automatically close other menu
        this.isDropdownOpenHasta = false;
        this.isDropdownOpenTanimlamalar = false;
        this.isDropdownOpenRandevu = false;
        this.isDropdownOpenSidebar = false;
      }
    }  else if (menu === 'tanimlamalar') {
      this.isDropdownOpenTanimlamalar = !this.isDropdownOpenTanimlamalar;
      if (this.isDropdownOpenTanimlamalar) {
        // Automatically close other menu
        this.isDropdownOpenHasta = false;
        this.isDropdownOpenRandevu = false;
        this.isDropdownOpenSatis = false;
      }
    }
  }

  signOut(){
    localStorage.removeItem("token");
    this.router.navigateByUrl("/login");
  }
}
