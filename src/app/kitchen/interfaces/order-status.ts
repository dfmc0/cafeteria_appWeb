export type OrderStatusString = 'CANCELADO' | 'FINALIZADO' | 'RECIBIDO' | 'EN_PREPARACION';

export const StatusCycle: OrderStatusString[] = [
  'CANCELADO',
  'FINALIZADO',
  'RECIBIDO',
  'EN_PREPARACION'
];

export const StatusLabelMap: Record<OrderStatusString, string> = {
  CANCELADO: 'Cancelado',
  FINALIZADO: 'Finalizado',
  RECIBIDO: 'RECIBIDO',
  EN_PREPARACION: 'EN_PREPARACION',
};