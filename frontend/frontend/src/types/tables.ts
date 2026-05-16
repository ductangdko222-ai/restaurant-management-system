export interface Area {
  id: number;
  tenkhuvuc: string;
  mota?: string;
  thutu?: number;
}

export interface Table {
  id: number;
  maban: string;
  tenban: string;
  khuvucid: number;
  khuvuc?: Area;
  sochongoi: number;
  trangthai: 'trong' | 'cokhach' | 'dattruoc';
  vitrix?: number;
  vitriy?: number;
}
