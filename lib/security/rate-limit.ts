import { getRedisClient } from "@/lib/events/redis";

const local = new Map<string, { count:number; reset:number }>();

export async function allowRequest(key:string, limit:number, windowSeconds:number) {
  try {
    const redis=await getRedisClient(), bucket=`rate:${key}:${Math.floor(Date.now()/(windowSeconds*1000))}`;
    const count=await redis.incr(bucket); if(count===1) await redis.expire(bucket,windowSeconds+2);
    return { allowed:count<=limit, remaining:Math.max(0,limit-count) };
  } catch(error) {
    console.warn("rate_limit.redis_unavailable", { key, error:error instanceof Error?error.message:"unknown" });
    const now=Date.now(), current=local.get(key); if(!current||current.reset<=now){local.set(key,{count:1,reset:now+windowSeconds*1000});return {allowed:true,remaining:limit-1};}
    current.count+=1; return {allowed:current.count<=limit,remaining:Math.max(0,limit-current.count)};
  }
}
