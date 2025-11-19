"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "../ui/button";

const Header = () => {
  const { data: session } = useSession();

  return (
    <header className="bg-gradient-to-r from-primary via-primary/95 to-primary/90 text-primary-foreground shadow-[var(--shadow-medium)] border-b border-white/10">
      <div className="container mx-auto px-6 py-8">
        <div className="text-center space-y-3">
          {/* Company Title */}
          <h1 className="text-4xl md:text-5xl font-bold tracking-wide drop-shadow-sm">
            PEARL CITY HOTEL (PVT) LTD
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl font-medium opacity-95 tracking-wide">
            AUTHORIZED FOREIGN MONEY CHANGER
          </p>

          {/* Contact Info */}
          <div className="text-sm md:text-base opacity-90 space-y-1">
            <p>17, Bauddhaloka Mawatha, Colombo - 04</p>
            <p>Tel: 0114523800 (Auto Lines)</p>
          </div>
        </div>
      </div>

      {session && (
        <div className="bg-primary/80 border-b border-white/10">
          <div className="container mx-auto px-6 py-2 flex justify-end">
            <Button
              variant="secondary"
              className="bg-white/10 hover:bg-white/30 border border-white/20 text-primary-foreground text-sm h-8"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Logout
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
