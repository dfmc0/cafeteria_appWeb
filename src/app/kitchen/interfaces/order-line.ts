import { LineModifier } from "./line-modifier";
import { MenuItem } from "./menu-item";

export interface OrderLine {
  id: number;
  itemName: string;
  itemPrice: number;
  quantity: number;
  lineAmount: number;
  lineModifiers?: LineModifier[];
  menuItem: MenuItem;
}