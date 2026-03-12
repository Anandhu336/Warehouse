import { useEffect, useState } from "react";
import BASE_URL from "../api";

export default function PalletDashboard(){

const [pallets,setPallets] = useState([]);

const load = async()=>{

const res = await fetch(`${BASE_URL}/pallet/dashboard`);
const data = await res.json();

setPallets(data);

};

useEffect(()=>{

load();

const interval = setInterval(load,5000);

return ()=>clearInterval(interval);

},[]);

return(

<div style={wrapper}>

<h2>📦 Pallet Dashboard</h2>

{pallets.map((p,index)=>(

<div key={index} style={card}>

<div style={{fontWeight:"bold"}}>
{p.pallet_id}
</div>

<div>Status: {p.status}</div>

<div>SKUs: {p.total_skus}</div>

<div>Cartons: {p.total_cartons}</div>

</div>

))}

</div>

);

}

const wrapper={
padding:40,
maxWidth:900,
margin:"auto",
color:"white"
}

const card={
background:"#1e293b",
padding:20,
marginTop:10,
borderRadius:6
}