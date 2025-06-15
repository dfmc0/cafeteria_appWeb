import { LineModifier } from "./line-modifier";
import { MenuItem } from "./menu-item";

export interface OrderLine {
  itemName: string;
  itemPrice: number;
  quantity: number;
  menuItemId: number;
  lineAmount: number;
  menuItem?: MenuItem; 
  lineModifiers: LineModifier[];
}