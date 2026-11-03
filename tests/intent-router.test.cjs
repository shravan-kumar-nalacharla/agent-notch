'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {routeIntent}=require('../src/intent-router.cjs'),{parseCommand}=require('../src/commands.cjs');
const cases=require('./fixtures/routing-regressions.json').cases;
for(const c of cases)test(c.id+': '+c.utterance,()=>{const route=routeIntent(c.utterance);assert.equal(route.intent,c.expected_intent);assert.equal(route.searchQuery,c.expected_search_query);if(route.intent==='multi_step_action')assert.notEqual(parseCommand(c.utterance)?.op,'webSearch');});
test('compound search cannot bypass the task executor',()=>assert.equal(parseCommand('search for Google AI Studio and then go to the API keys section'),null));
