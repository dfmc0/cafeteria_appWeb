import { Modifier } from "./modifier";

export interface LineModifier {
  id: number;
  name: string;
  price: number;
  modifier: Modifier;
  orderLine: string; // Si es un ID o string, ajústalo si necesitas
}