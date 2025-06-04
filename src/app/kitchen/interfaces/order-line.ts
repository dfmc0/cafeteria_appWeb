import { LineModifier } from "./line-modifier";

export interface OrderLine {
  id: number;
  itemName: string;
  itemPrice: number;
  quantity: number;
  lineAmount: number;
  lineModifiers?: LineModifier[];
  menu_item_id: number;
}