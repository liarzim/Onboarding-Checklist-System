"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapPin, Search, ChevronDown, Check } from "lucide-react";
import { searchIsraeliCities } from "@/lib/geo/israeliCities";

interface AddressAutocompleteProps {
  city: string;
  street: string;
  onCityChange: (city: string) => void;
  onStreetChange: (street: string) => void;
  cityLabel?: string;
  streetLabel?: string;
  cityRequired?: boolean;
  streetRequired?: boolean;
  disabled?: boolean;
}

export default function AddressAutocomplete({
  city,
  street,
  onCityChange,
  onStreetChange,
  cityLabel = "ישוב / עיר",
  streetLabel = "שם רחוב",
  cityRequired = false,
  streetRequired = false,
  disabled = false,
}: AddressAutocompleteProps) {
  // City suggestions state
  const [cityInput, setCityInput] = useState(city);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);

  // Street suggestions state
  const [streetInput, setStreetInput] = useState(street);
  const [streetSuggestions, setStreetSuggestions] = useState<string[]>([]);
  const [showStreetDropdown, setShowStreetDropdown] = useState(false);
  const streetRef = useRef<HTMLDivElement>(null);

  // Sync external values
  useEffect(() => {
    setCityInput(city);
  }, [city]);

  useEffect(() => {
    setStreetInput(street);
  }, [street]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setShowCityDropdown(false);
      }
      if (streetRef.current && !streetRef.current.contains(e.target as Node)) {
        setShowStreetDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update city search
  function handleCityInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setCityInput(val);
    onCityChange(val);

    if (val.trim().length >= 1) {
      const matches = searchIsraeliCities(val, 10).map((c) => c.name);
      setCitySuggestions(matches);
      setShowCityDropdown(true);
    } else {
      setCitySuggestions([]);
      setShowCityDropdown(false);
    }
  }

  function handleSelectCity(selectedCity: string) {
    setCityInput(selectedCity);
    onCityChange(selectedCity);
    setShowCityDropdown(false);

    // Fetch streets for selected city
    fetchStreetsForCity(selectedCity, "");
  }

  // Update street search
  function handleStreetInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setStreetInput(val);
    onStreetChange(val);

    if (val.trim().length >= 1) {
      fetchStreetsForCity(cityInput, val);
      setShowStreetDropdown(true);
    } else {
      setShowStreetDropdown(false);
    }
  }

  function handleSelectStreet(selectedStreet: string) {
    setStreetInput(selectedStreet);
    onStreetChange(selectedStreet);
    setShowStreetDropdown(false);
  }

  async function fetchStreetsForCity(targetCity: string, query: string) {
    try {
      const url = `/api/geo/streets?city=${encodeURIComponent(targetCity || "")}&q=${encodeURIComponent(
        query || ""
      )}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.streets && Array.isArray(data.streets)) {
          setStreetSuggestions(data.streets);
          setShowStreetDropdown(true);
        }
      }
    } catch {
      // Ignore
    }
  }

  return (
    <>
      {/* City field with autocomplete */}
      <div className="relative" ref={cityRef}>
        <label className="font-bold text-slate-700 block mb-1 text-xs sm:text-sm">
          {cityLabel} {cityRequired && <span className="text-rose-500 font-bold">*</span>}
        </label>
        <div className="relative">
          <input
            type="text"
            value={cityInput}
            onChange={handleCityInputChange}
            onFocus={() => {
              if (cityInput.trim().length >= 1) {
                const matches = searchIsraeliCities(cityInput, 10).map((c) => c.name);
                setCitySuggestions(matches);
                setShowCityDropdown(true);
              }
            }}
            placeholder="הקלד שם ישוב (למשל: תל אביב)"
            disabled={disabled}
            className="w-full border border-slate-300 rounded-xl py-2 px-3 pl-8 text-sm bg-white focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
          />
          <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
        </div>

        {/* City Autocomplete Dropdown */}
        {showCityDropdown && citySuggestions.length > 0 && (
          <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
            {citySuggestions.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleSelectCity(c)}
                className="w-full text-right px-3 py-2 text-xs text-slate-800 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition"
              >
                <span>{c}</span>
                {c === cityInput && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Street field with autocomplete */}
      <div className="relative" ref={streetRef}>
        <label className="font-bold text-slate-700 block mb-1 text-xs sm:text-sm">
          {streetLabel} {streetRequired && <span className="text-rose-500 font-bold">*</span>}
        </label>
        <div className="relative">
          <input
            type="text"
            value={streetInput}
            onChange={handleStreetInputChange}
            onFocus={() => {
              if (cityInput) {
                fetchStreetsForCity(cityInput, streetInput);
              }
            }}
            placeholder={cityInput ? `רחוב ב${cityInput}` : "שם רחוב"}
            disabled={disabled}
            className="w-full border border-slate-300 rounded-xl py-2 px-3 pl-8 text-sm bg-white focus:ring-2 focus:ring-blue-500 text-slate-800"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
        </div>

        {/* Street Autocomplete Dropdown */}
        {showStreetDropdown && streetSuggestions.length > 0 && (
          <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
            {streetSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSelectStreet(s)}
                className="w-full text-right px-3 py-2 text-xs text-slate-800 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition"
              >
                <span>{s}</span>
                {s === streetInput && <Check className="w-3.5 h-3.5 text-blue-600" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
