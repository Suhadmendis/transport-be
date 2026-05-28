import { Driver, Vehicle, Cleaner, Item } from '../types';
import driversJson from './drivers.json';
import vehiclesJson from './vehicles.json';
import cleanersJson from './cleaners.json';
import itemsJson from './items.json';

export const mockDrivers  = driversJson  as Driver[];
export const mockVehicles = vehiclesJson as Vehicle[];
export const mockCleaners = cleanersJson as Cleaner[];
export const mockItems    = itemsJson    as Item[];
