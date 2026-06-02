using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;


namespace BaseCore.Common
{
    public static class RedisUtils
    {
        public static async void DeleteAllCacheAsyn(this IConnectionMultiplexer muxer, IConfiguration configuration, string pattern)
        {
            var defaultDatabase = !string.IsNullOrEmpty(configuration["Redis:DefaultDatabase"])
                ? int.Parse(configuration["Redis:DefaultDatabase"]) : 10;
            var server = muxer.GetServer(configuration["Redis:ConnectionString"]);
            var db = muxer.GetDatabase();
            foreach (var key in server.Keys(defaultDatabase, pattern: "*" + pattern + "*"))
            {
                await db.KeyDeleteAsync(key);
            }
        }
    
        public static async Task<TResult> GetOrSetCacheAsync<TResult>(this IDistributedCache cache, string key,
            Func<TResult> storingItem, IConfiguration configuration = null)
            where TResult : class
        {
            var cachedValue = await cache.GetCacheValueAsync<TResult>(key);
            if (cachedValue == null)
            {
                return await cache.StoreValueAsync(key, storingItem, configuration);
            }

            return cachedValue;
        }

        public static TResult GetOrSetCache<TResult>(this IDistributedCache cache, string key,
            Func<TResult> storingItem, IConfiguration configuration = null)
            where TResult : class
        {
            var cachedValue = cache.GetCacheValue<TResult>(key);
            if (cachedValue == null)
            {
                return cache.StoreValue(key, storingItem, configuration);
            }

            return cachedValue;
        }

        public static TResult GetCacheValue<TResult>(this IDistributedCache cache, string key)
            where TResult : class
        {
            try
            {
                var cachedValue = cache.GetString(key.ToLower(CultureInfo.InvariantCulture));
                if (string.IsNullOrEmpty(cachedValue))
                {
                    return null;
                }

                return JsonConvert.DeserializeObject<TResult>(cachedValue);
            }
            catch (Exception ex)
            {
                return null;
            }
        }

        public static async Task<TResult> GetCacheValueAsync<TResult>(this IDistributedCache cache, string key)
            where TResult : class
        {
            var cachedValue = await cache.GetStringAsync(key.ToLower(CultureInfo.InvariantCulture));
            if (string.IsNullOrEmpty(cachedValue))
            {
                return null;
            }

            return JsonConvert.DeserializeObject<TResult>(cachedValue);
        }

        public static async Task<TResult> StoreValueAsync<TResult>(this IDistributedCache cache, string key,
            Func<TResult> storingItem, IConfiguration configuration = null)
            where TResult : class
        {
            var storingValue = storingItem();
            if (storingValue != null && storingValue != default(TResult))
            {
                var redisKey = key.ToLower(CultureInfo.InvariantCulture);
                var value = JsonConvert.SerializeObject(storingValue);

                if (!value.Equals("[]"))     
                {
                    if (configuration != null)
                    {
                        var expireMinute = !string.IsNullOrEmpty(configuration["Redis:CachingExpireMinute"]) ? int.Parse(configuration["Redis:CachingExpireMinute"]) : 1;
                        var cacheRule = new DistributedCacheEntryOptions
                        {
                            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(expireMinute)
                        };
                        await cache.SetStringAsync(redisKey, value, cacheRule);
                    }
                    else
                    {
                        await cache.SetStringAsync(redisKey, value);
                    }
                }
            }
            return storingValue;
        }

        public static TResult StoreValue<TResult>(this IDistributedCache cache, string key,
            Func<TResult> storingItem, IConfiguration configuration = null)
            where TResult : class
        {
            var storingValue = storingItem();
            if (storingValue != null && storingValue != default(TResult))
            {
                var redisKey = key.ToLower(CultureInfo.InvariantCulture);
                var value = JsonConvert.SerializeObject(storingValue);

                if (!value.Equals("[]"))     
                {
                    if (configuration != null)
                    {
                        var expireMinute = !string.IsNullOrEmpty(configuration["Redis:CachingExpireMinute"]) ? int.Parse(configuration["Redis:CachingExpireMinute"]) : 1;
                        var cacheRule = new DistributedCacheEntryOptions
                        {
                            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(expireMinute)
                        };
                        cache.SetString(redisKey, value, cacheRule);
                    }
                    else
                    {
                        cache.SetString(redisKey, value);
                    }
                }
            }
            return storingValue;
        }

        public static string GetPropertyValues(this IDistributedCache cache, Object obj)
        {
            var listItem = new Dictionary<string, string>();
            if (obj != null)
            {
                Type t = obj.GetType();
                PropertyInfo[] props = t.GetProperties().Where(x => x.Name != "Id").ToArray();
                foreach (var prop in props)
                {
                    var value = prop.GetValue(obj);
                    if (prop.GetIndexParameters().Length == 0 && value != null)
                    {
                        listItem[prop.Name] = value.ToString();
                    }
                }
            }
            return JsonConvert.SerializeObject(listItem);
        }
    }
}
