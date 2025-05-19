import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  fechaActual: Date = new Date();

  constructor() {
    setInterval(() => {
      this.fechaActual = new Date();
    }, 1000);
  }

  ngOnInit(): void {
  }
}