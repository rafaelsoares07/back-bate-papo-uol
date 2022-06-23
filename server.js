import express from "express";
import cors from "cors"
import dayjs from "dayjs";
import { MongoClient } from "mongodb";
import dotenv from "dotenv"
dotenv.config()

const app = express();
app.use(express.json());
app.use(cors())

//conectando ao banco
const mongoClient = new MongoClient(process.env.MONGO_URL_CONECTION);
let db;

mongoClient.connect().then(() => {
	db = mongoClient.db("Banco_De_Dados_UOL");
	
});


app.post("/participants", async(req, res) => {
	
	const {name} = req.body
	if(!name){
		res.sendStatus(422)
		return
	}

	const userJaExiste = await db.collection('users').findOne({name:name})
	if(userJaExiste){
		res.sendStatus(409)
		return
	}
	
	try{

		const user = await db.collection("users").insertOne({name:name, lastStatus:Date.now()})
		const mensagem = {
			from: name,
			to: 'Todos',
			text: 'entra na sala...',
			type: 'status',
			time: dayjs().locale("pt-br").format("HH:mm:ss"),
		}

		await db.collection("mensagens").insertOne(mensagem)
		

		res.status(201).send(user)

	} catch(err){

		res.status(400).send('deu errado')
	}
});


app.get("/participants", async(req, res)=>{

	try{

		const usuarios = await db.collection("users").find().toArray()
		console.log(usuarios)
		res.send(usuarios)

	} catch(err){

		res.send('deu erro')
	}
	
});




app.listen(5000,()=>{
    console.log('Servidor rodando...')
});






 

