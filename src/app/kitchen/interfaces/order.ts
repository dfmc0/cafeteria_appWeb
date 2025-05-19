import { OrderLine } from "./order-line";
import { OrderStatusString } from "./order-status";
import { Teacher } from "./teacher";

export interface Order {
  id: number;
  orderDate: string | null;       
  paymentDate: string | null;     
  totalAmount: number;
  status: OrderStatusString; 
  teacher: Teacher;                
  orderLines: OrderLine[];
}
