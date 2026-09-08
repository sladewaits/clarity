"use client";
import {
  LayoutDashboard, Users, ClipboardList, Building2, Search, LayoutGrid,
  GraduationCap, BarChart3, MapPin, Contact, LifeBuoy, Settings, type LucideIcon,
  Truck, Tag, BookOpen, Award, User, Bell, Clipboard, ShieldCheck, Boxes,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, Users, ClipboardList, Building2, Search, LayoutGrid,
  GraduationCap, BarChart3, MapPin, IdCard: Contact, LifeBuoy, Settings,
  truck: Truck, tag: Tag, book: BookOpen, award: Award, user: User,
  bell: Bell, clipboard: Clipboard, shield: ShieldCheck, boxes: Boxes,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name] ?? Boxes;
  return <Cmp className={className} />;
}
