import { LineModifier } from "./line-modifier";
import { MenuItem } from "./menu-item";

export interface OrderLine {
  id: number;
  line: { id: number; name: string; };
  itemName: string;
  itemPrice: number;
  quantity: number;
  menuItemId: number;
  lineAmount: number;
  menuItem?: MenuItem; 
  lineModifiers: LineModifier[];
}