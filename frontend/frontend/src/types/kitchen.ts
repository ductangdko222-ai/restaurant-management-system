export interface Ticket {
  id: number;
  maphieu: string;
  tenmon: string;
  soluong: number;
  ghichumon?: string;
  tenban: string;
  madon: string;
  donhangid: number;
  trangthai: 'moi' | 'danglam' | 'sansang';
  thoigiantao: string;
  thoigianbatdau?: string;
  thoigianhoanthanh?: string;
  bienthe?: { tenbienthe: string }[];
}

export interface KitchenData {
  moi: Ticket[];
  danglam: Ticket[];
  sansang: Ticket[];
}
