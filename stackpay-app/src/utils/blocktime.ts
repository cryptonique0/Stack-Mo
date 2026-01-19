import { formatDistanceToNow } from "date-fns";

const BLOCK_TIME_SECONDS = 600; // 10 minutes
const BLOCKS_PER_DAY = (24 * 60 * 60) / BLOCK_TIME_SECONDS; // ~144 blocks

/**
 * Converts block height to Date object
 */
export function blockToDate(
  blockHeight: number,
  currentBlock: number,
  currentTime: number,
): Date {
  const diff = Number(blockHeight) - Number(currentBlock);
  return new Date(currentTime + diff * BLOCK_TIME_SECONDS * 1000);
}

/**
 * Checks if a block height represents an expired time
 */
export function isBlockExpired(
  blockHeight: number | null,
  currentBlock: number | null,
): boolean {
  if (!blockHeight || currentBlock === null) return false;
  return blockHeight <= currentBlock;
}

/**
 * Formats block time as relative time from now
 */
export function formatBlockTime(date: Date | null): string {
  if (!date) return "N/A";
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Formats block time as localized date string
 */
export function formatBlockDate(date: Date | null): string {
  if (!date) return "N/A";
  return date.toLocaleString();
}

/**
 * Gets a date object for a block height if valid
 */
export function getBlockDate(
  blockHeight: number | null,
  currentBlock: number | null,
  currentTime: number,
): Date | null {
  if (!blockHeight || currentBlock === null) return null;
  return blockToDate(blockHeight, currentBlock, currentTime);
}

/**
 * Fetches current block height from Stacks API
 */
export async function fetchCurrentBlockHeight(): Promise<number> {
  const res = await fetch("https://api.testnet.hiro.so/v2/info");
  const data = await res.json();
  return data.stacks_tip_height;
}

/**
 * Converts a relative number of days to blocks
 */
export function daysToBlocks(days: number): number {
  return Math.floor(days * BLOCKS_PER_DAY);
}

/**
 * Gets expiry block height for a given number of days from now
 */
export function getExpiryBlockHeight(
  currentBlock: number,
  daysFromNow: number,
): number {
  return currentBlock + daysToBlocks(daysFromNow);
}
