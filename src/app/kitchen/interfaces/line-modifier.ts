import { Modifier } from "./modifier";

export interface LineModifier {
  mod: { id: number; name: string; };
  id: number;
  name: string;
  price: number;
  modifierId?: number;
  modifier?: Modifier;
  orderLine: string; // Si es un ID o string, ajústalo si necesitas
}