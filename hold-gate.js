export class HoldGate {
  constructor(open, schedule=setTimeout, unschedule=clearTimeout){this.open=open;this.schedule=schedule;this.unschedule=unschedule;this.timer=null;}
  start(){if(this.timer!==null)return;this.timer=this.schedule(()=>{this.timer=null;this.open();},2000);}
  cancel(){if(this.timer!==null)this.unschedule(this.timer);this.timer=null;}
}
