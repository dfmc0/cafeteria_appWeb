import { Modifier } from "./modifier";

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  imageLink: string;
  haveModifiers: boolean; 
  category: string;
  allowedModifiers: Modifier[]; 
}