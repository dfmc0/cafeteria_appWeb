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
  RECIBIDO: 'Recibido',
  EN_PREPARACION: 'En Preparación',
};