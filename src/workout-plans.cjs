'use strict';
const PLANS=[
  {id:'treadmill',title:'Treadmill walk',category:'cardio',plannedMinutes:20,notes:'An editable starting plan. Choose your own comfortable speed and incline; pause or stop when needed.',exercises:[{name:'Treadmill · easy warm-up',seconds:300},{name:'Treadmill · main walk',seconds:600},{name:'Treadmill · easy cool-down',seconds:300}]},
  {id:'dumbbells',title:'Dumbbell basics',category:'full-body',plannedMinutes:20,notes:'An editable exercise list, not a prescribed intensity. Choose suitable loads and alternatives for yourself.',exercises:[{name:'Dumbbell squat',sets:2,reps:8,alternative:'Bodyweight sit-to-stand'},{name:'Dumbbell row',sets:2,reps:8,alternative:'Supported row'},{name:'Dumbbell floor press',sets:2,reps:8,alternative:'Wall press'},{name:'Gentle mobility',seconds:180}]},
  {id:'mixed',title:'Walk + dumbbells',category:'custom',plannedMinutes:30,notes:'Adjust exercises, time and rest to fit your own plan. No schedule is enabled automatically.',exercises:[{name:'Treadmill walk',seconds:600},{name:'Dumbbell row',sets:2,reps:8},{name:'Dumbbell squat',sets:2,reps:8},{name:'Cool-down and mobility',seconds:300}]}
];
function createPlan(routines,id){const plan=PLANS.find(p=>p.id===id);if(!plan)throw new Error('Choose an available workout plan.');const{ id:template,...value}=structuredClone(plan);return routines.action('workout:save',value);}
module.exports={PLANS,createPlan};
