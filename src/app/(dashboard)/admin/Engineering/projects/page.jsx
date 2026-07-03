"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Select from "react-select";
import { useRouter } from "next/navigation";
import { HiDotsVertical } from "react-icons/hi";

import {
  FaProjectDiagram,
  FaPlus,
  FaCheck
} from "react-icons/fa";


export default function ProjectsPage() {


  const [projects,setProjects] = useState([]);
  const [workspaces,setWorkspaces] = useState([]);
  const [users,setUsers] = useState([]);

  const [customers,setCustomers] = useState([]);
  const [salesOrders,setSalesOrders] = useState([]);


  const [name,setName] = useState("");
  const [description,setDescription] = useState("");


  // NEW FIELDS
  const [projectType,setProjectType] = useState("");
  const [businessUnit,setBusinessUnit] = useState("");
  const [address,setAddress] = useState("");
  const [documents,setDocuments] = useState("");



  const [workspaceId,setWorkspaceId] = useState("");
  const [status,setStatus] = useState("active");
  const [priority,setPriority] = useState("low");


  const [customer,setCustomer] = useState("");
  const [salesOrder,setSalesOrder] = useState("");


  const [assignees,setAssignees] = useState([]);


  const [estimatedCosting,setEstimatedCosting] = useState("");
  const [defaultCostCenter,setDefaultCostCenter] = useState("");

const [startDate,setStartDate] = useState("");
const [dueDate,setDueDate] = useState("");



  const [isModalOpen,setIsModalOpen] = useState(false);
  const [editProject,setEditProject] = useState(null);

  const [loading,setLoading] = useState(true);



  const router = useRouter();





  useEffect(()=>{


    const fetchData = async()=>{


      try{


        const token = localStorage.getItem("token");


        const headers = {

          headers:{
            Authorization:`Bearer ${token}`
          }

        };



        const [
          uRes,
          pRes,
          wRes,
          cRes,
          soRes

        ] = await Promise.all([


          api.get("/company/users",headers),

          api.get("/project/projects",headers),

          api.get("/project/workspaces",headers),

          api.get("/customers",headers),

          api.get("/sales-order",headers)


        ]);



        setUsers(

          uRes.data.filter(
            u=>u.roles?.includes("Employee")
          )

        );


        setProjects(pRes.data);

        setWorkspaces(wRes.data);

        setCustomers(cRes.data.data || []);

        setSalesOrders(soRes.data.data || []);



      }
      catch(err){

        console.log(err);

      }
      finally{

        setLoading(false);

      }



    };



    fetchData();



  },[]);






  const openModal=(project=null)=>{


    setEditProject(project);



    setName(project?.name || "");

    setDescription(project?.description || "");



    setProjectType(project?.projectType || "");

    setBusinessUnit(project?.businessUnit || "");

    setAddress(project?.address || "");

    setDocuments(project?.documents || "");




    setWorkspaceId(
      project?.workspace?._id || ""
    );



    setStatus(
      project?.status || "active"
    );



    setPriority(
      project?.priority || "low"
    );



    setIsModalOpen(true);


  };






  const closeModal=()=>{


    setIsModalOpen(false);

    setEditProject(null);


    setName("");

    setDescription("");

    setProjectType("");

    setBusinessUnit("");

    setAddress("");

    setDocuments("");



  };







  const handleSubmit=async(e)=>{


    e.preventDefault();



    const payload={


      name,

      description,


      projectType,

      businessUnit,

      address,

      documents,


      workspace:workspaceId,

      status,

      priority,


      members:assignees,


      customer:customer?.value || null,

      salesOrder:salesOrder?.value || null,


      estimatedCosting,

        defaultCostCenter,

          startDate,

        dueDate



    };



    try{


      if(editProject){


        const res = await api.put(

          `/project/projects/${editProject._id}`,

          payload

        );



        setProjects(prev=>

          prev.map(p=>

            p._id===editProject._id

            ? res.data

            : p

          )

        );


      }
      else{


        const res = await api.post(

          "/project/projects",

          payload

        );


        setProjects([

          ...projects,

          res.data

        ]);



      }



      closeModal();


    }
    catch(err){

      console.log(err);

    }


  };







  const Lbl=({text,req})=>(

    <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">

      {text}

      {
        req &&
        <span className="text-red-500">*</span>
      }

    </label>

  );




  const fi =

  "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-500 outline-none";


  return (

    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">


      <div className="max-w-7xl mx-auto">


        {/* Header */}

        <div className="flex justify-between items-center mb-8">


          <h1 className="text-2xl font-bold flex items-center gap-2">

            <FaProjectDiagram className="text-indigo-600"/>

            Projects

          </h1>



          <button

            onClick={()=>openModal()}

            className="bg-indigo-600 text-white px-5 py-2 rounded-lg flex items-center gap-2"

          >

            <FaPlus size={12}/>

            New Project


          </button>



        </div>





        {/* Table */}


        <div className="bg-white rounded-xl shadow border overflow-hidden">


          <table className="w-full">


            <thead>


              <tr className="bg-gray-100">


                <th className="p-4 text-left">
                  Project
                </th>


                <th className="p-4">
                  Type
                </th>


                <th className="p-4">
                  Business Unit
                </th>


                <th className="p-4">
                  Status
                </th>


                <th className="p-4">
                  Action
                </th>


              </tr>


            </thead>



            <tbody>


            {
              projects.map((p)=>(


                <tr 
                  key={p._id}
                  className="border-t"
                >


                  <td className="p-4 font-semibold text-indigo-600">

                    {p.name}

                  </td>



                  <td className="p-4">

                    {p.projectType || "-"}

                  </td>




                  <td className="p-4">

                    {p.businessUnit || "-"}

                  </td>




                  <td className="p-4">

                    {p.status}

                  </td>



                  <td className="p-4">


                    <button

                      onClick={()=>openModal(p)}

                      className="text-gray-500"

                    >

                      <HiDotsVertical/>

                    </button>


                  </td>


                </tr>



              ))
            }


            </tbody>



          </table>



        </div>



      </div>









{/* MODAL */}


{
isModalOpen && (


<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">


<div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">





<div className="p-6 border-b">


<h2 className="text-xl font-bold">

{
editProject

?

"Update Project"

:

"New Project"

}

</h2>


</div>








<form

onSubmit={handleSubmit}

className="p-8 space-y-6"


>







{/* BASIC INFO */}


<div className="grid grid-cols-1 md:grid-cols-2 gap-6">





{/* Project Name */}

<div className="md:col-span-2">


<Lbl text="Project Name" req/>


<input

className={fi}

value={name}

onChange={(e)=>setName(e.target.value)}

required

/>


</div>






{/* Description */}

<div className="md:col-span-2">


<Lbl text="Project Description"/>


<textarea

className={`${fi} h-24 resize-y`}

value={description}

onChange={(e)=>setDescription(e.target.value)}


/>


</div>









{/* Project Type */}


<div>


<Lbl text="Project Type"/>


<select

className={fi}

value={projectType}

onChange={(e)=>setProjectType(e.target.value)}

>


<option value="">

Select Type

</option>


<option>

Internal

</option>


<option>

External

</option>


<option>

Client

</option>



</select>


</div>










{/* Business Unit */}



<div>


<Lbl text="Business Unit"/>


<select

className={fi}

value={businessUnit}

onChange={(e)=>setBusinessUnit(e.target.value)}

>


<option value="">

Select Business Unit

</option>


<option>

IT

</option>


<option>

Finance

</option>


<option>

HR

</option>


<option>

Marketing

</option>


</select>



</div>









{/* Address */}


<div className="md:col-span-2">


<Lbl text="Address"/>


<textarea


className={`${fi} h-20 resize-y`}


value={address}


onChange={(e)=>setAddress(e.target.value)}


placeholder="Enter address"


/>



</div>









{/* Documents */}



<div className="md:col-span-2">


<Lbl text="Documents"/>


<textarea


className={`${fi} h-24 resize-y`}


value={documents}


onChange={(e)=>setDocuments(e.target.value)}


placeholder="Add documents"


/>


</div>





</div>
{/* Workspace & Team */}

<div className="border-t pt-6">


<p className="font-bold text-indigo-500 text-sm mb-4">
Organization & Team
</p>



<div className="grid grid-cols-1 md:grid-cols-2 gap-6">



<div>


<Lbl text="Workspace" req/>


<select

className={fi}

value={workspaceId}

onChange={(e)=>setWorkspaceId(e.target.value)}

required

>


<option value="">

Select Workspace

</option>


{

workspaces.map(w=>(

<option

key={w._id}

value={w._id}

>

{w.name}

</option>

))

}



</select>


</div>






<div>


<Lbl text="Team Members"/>



<Select


isMulti


options={users.map(u=>(

{

value:u._id,

label:u.name

}

))}



value={assignees.map(id=>(

{

value:id,

label:users.find(u=>u._id===id)?.name || id

}

))}



onChange={(data)=>

setAssignees(

data.map(x=>x.value)

)

}


/>



</div>



</div>


</div>










{/* Customer & Billing */}


<div className="border-t pt-6">


<p className="font-bold text-indigo-500 text-sm mb-4">

Financial Details

</p>





<div className="grid grid-cols-1 md:grid-cols-2 gap-6">





<div>


<Lbl text="Customer"/>


<Select


options={customers.map(c=>(

{

value:c._id,

label:c.customerName

}

))}



value={customer}



onChange={(s)=>setCustomer(s)}


/>



</div>







<div>


<Lbl text="Sales Order"/>


<Select


options={salesOrders.map(s=>(

{

value:s._id,

label:s.documentNumberOrder

}

))}



value={salesOrder}



onChange={(s)=>setSalesOrder(s)}


/>


</div>







<div>


<Lbl text="Estimated Cost"/>


<input


className={fi}


value={estimatedCosting}


onChange={(e)=>

setEstimatedCosting(e.target.value)

}


/>


</div>








<div>


<Lbl text="Cost Center"/>


<input


className={fi}


value={defaultCostCenter}


onChange={(e)=>

setDefaultCostCenter(e.target.value)

}


/>


</div>






</div>



</div>









{/* Timeline */}


<div className="border-t pt-6">



<p className="font-bold text-indigo-500 text-sm mb-4">

Timeline

</p>

<div className="grid grid-cols-1 md:grid-cols-4 gap-6">

  {/* Priority */}
  <div>
    <Lbl text="Priority"/>

    <select
      className={fi}
      value={priority}
      onChange={(e)=>setPriority(e.target.value)}
    >
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="critical">Critical</option>
    </select>
  </div>

  {/* Start Date */}
  <div>
    <Lbl text="Start Date"/>

    <input
      type="date"
      className={fi}
      value={startDate}
      onChange={(e)=>setStartDate(e.target.value)}
    />
  </div>

  {/* End Date */}
  <div>
    <Lbl text="End Date"/>

    <input
      type="date"
      className={fi}
      value={dueDate}
      onChange={(e)=>setDueDate(e.target.value)}
    />
  </div>

  {/* Status */}
  <div>
    <Lbl text="Status"/>

    <select
      className={fi}
      value={status}
      onChange={(e)=>setStatus(e.target.value)}
    >
      <option value="active">
        Active
      </option>

      <option value="archived">
        Archived
      </option>
    </select>
  </div>

</div>


</div>









{/* Footer Buttons */}


<div className="flex justify-end gap-4 border-t pt-6">



<button


type="button"


onClick={closeModal}


className="px-5 py-2 border rounded-lg"


>


Cancel


</button>





<button


type="submit"


className="px-6 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2"


>


<FaCheck size={12}/>


{

editProject

?

"Update"

:

"Create"

}


</button>





</div>





</form>



</div>



</div>



)

}



</div>


);


}