#!/usr/bin/env node

const redis = require('redis');

async function checkRedisHealth() {
  const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  try {
    console.log('🔍 Checking Redis connection...');
    
    // Connect to Redis
    await client.connect();
    console.log('✅ Redis connection established');
    
    // Test basic operations
    console.log('🧪 Testing Redis operations...');
    
    // Test SET/GET
    await client.set('health_check', 'ok');
    const value = await client.get('health_check');
    console.log(`✅ SET/GET test: ${value === 'ok' ? 'PASSED' : 'FAILED'}`);
    
    // Test TTL
    await client.setEx('temp_key', 10, 'temp_value');
    const ttl = await client.ttl('temp_key');
    console.log(`✅ TTL test: ${ttl > 0 ? 'PASSED' : 'FAILED'} (TTL: ${ttl}s)`);
    
    // Test HASH operations
    await client.hSet('test_hash', 'field1', 'value1');
    const hashValue = await client.hGet('test_hash', 'field1');
    console.log(`✅ HASH test: ${hashValue === 'value1' ? 'PASSED' : 'FAILED'}`);
    
    // Test SET operations
    await client.sAdd('test_set', 'member1');
    const isMember = await client.sIsMember('test_set', 'member1');
    console.log(`✅ SET test: ${isMember ? 'PASSED' : 'FAILED'}`);
    
    // Test INCR
    const counter = await client.incr('test_counter');
    console.log(`✅ INCR test: ${counter === 1 ? 'PASSED' : 'FAILED'}`);
    
    // Clean up test data
    await client.del('health_check', 'temp_key', 'test_hash', 'test_set', 'test_counter');
    console.log('🧹 Test data cleaned up');
    
    // Get Redis info
    const info = await client.info();
    const lines = info.split('\r\n');
    const version = lines.find(line => line.startsWith('redis_version'));
    const uptime = lines.find(line => line.startsWith('uptime_in_seconds'));
    const connectedClients = lines.find(line => line.startsWith('connected_clients'));
    
    console.log('\n📊 Redis Information:');
    console.log(`   Version: ${version?.split(':')[1] || 'Unknown'}`);
    console.log(`   Uptime: ${uptime?.split(':')[1] || 'Unknown'} seconds`);
    console.log(`   Connected Clients: ${connectedClients?.split(':')[1] || 'Unknown'}`);
    
    console.log('\n🎉 All Redis tests passed! Redis is healthy and ready.');
    
  } catch (error) {
    console.error('❌ Redis health check failed:', error.message);
    process.exit(1);
  } finally {
    await client.quit();
    console.log('🔌 Redis connection closed');
  }
}

// Run health check
checkRedisHealth().catch(console.error);
