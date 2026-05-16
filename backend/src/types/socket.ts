import { KhuVucCheBien } from './enums';

export interface SocketEvents {
  'join:kitchen': (khuvuc: KhuVucCheBien) => void;
  'join:waiter': (nguoidungid: number) => void;
  'ticket:new': (data: any) => void;
  'ticket:updated': (data: any) => void;
  'order:updated': (data: any) => void;
  'table:updated': (data: any) => void;
}
