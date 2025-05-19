import { Modifier } from "./modifier";

export interface MenuItem {
    id: number;
    name: string;
    price: number;
    imageLink: string;
    have_modifiers: boolean;
    category: string;
    modifiers: Modifier[];
}
