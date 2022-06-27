import express from "express";
import cors from "cors"
import dayjs from "dayjs";
import joi from "joi"
import { MongoClient } from "mongodb";
import dotenv from "dotenv"
dotenv.config()

const app = express();
app.use(express.json());
app.use(cors())


// CONEXÃO COM BANCO DE DADOS 
const mongoClient = new MongoClient(process.env.MONGO_URL_CONECTION);

let db;

mongoClient.connect().then(() => {
	db = mongoClient.db("Banco_De_Dados_UOL");
});


//JOI VALIDAÇÕES
const userSchema = joi.object({
	name:joi.string().required()
})

const messageSchema = joi.object({
	to:joi.string().required(),
	text:joi.string().required(),
	from:joi.string().required(),
	type:joi.string().valid("message", "private_message").required()
})


//FUNÇOES FORA DAS ROTAS DO EXPRESS 
setInterval(async()=>{
	const participantes = await db.collection('users').find().toArray()
	participantes.forEach(async (user) => {
		
		if(Date.now()-user.lastStatus >1000){
			await db.collection('users').deleteOne({name: user.name})
			 const mensagemExit = {
				from:'xxx',
				to:'Todos',
				text:'sai da sala...',
				type:'status',
				time:dayjs().locale("pt-br").format("HH:mm:ss")
			}
			await db.collection('mensagens').insertOne(mensagemExit)
		}
	});

},15000)




//ROTAS DO BACK END 
app.post("/participants", async(req, res) => {
	
	const {name} = req.body
	const validacao = userSchema.validate({name})

	if(validacao.error){
		res.status(422).send('Campo em branco')
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

	const {user}= req.headers
	//console.log(user+'do get')


	try{

		const usuarios = await db.collection("users").find().toArray()
		await db.collection("users").find({name:user})// alterar o laststatus

		res.send(usuarios)

	} catch(err){

		res.send('deu erro')
	}
	
});


app.post("/messages", async (req, res)=>{
	const { to , text, type } = req.body
	const from = req.headers.user
	const message = {
		to,
		text,
		type,
		from
	} 

	const validacao = messageSchema.validate(message)
	if(validacao.error){
		res.status(422).send('Deu erro ')
		return
	}

	
	const userExiste = await db.collection('users').findOne({name:from})
	if(!userExiste){
		
		res.status(422).send('Usuario nao esta na lista')
		return
	}

	await db.collection("mensagens").insertOne({...message, time: dayjs().locale("pt-br").format("HH:mm:ss")})
	res.status(201).send()

	
})

app.get("/messages" , async(req, res)=>{
	const limit = parseInt(req.query.limit);
	const {user} = req.headers

	//console.log(user+' USER SERVIDOR')

	// flitar mensagens públicas, enviadas pelo user e recebidas só para o user 
	const mensagens = await db.collection("mensagens").find({$or:[{type:'message'},{type:'status'},{from:user},{to:user}]}).toArray()
	//console.log(mensagens.length)


	if(mensagens.length>limit){
		const mensagensLimite = mensagens.slice(-50)
		res.status(201).send(mensagensLimite)
		return
	}

	res.status(201).send(mensagens)
})


app.post("/status", async(req, res)=>{
	const {user} = req.headers
	console.log(user) 
 	
	const usuarioExiste = await db.collection('users').findOne({name:user})
	
	console.log(usuarioExiste +' usuario esxite')

	

	if(!usuarioExiste){
		
		res.status(404).send('usuario não existe ')
	}

	await db.collection('users').updateOne({
		name:usuarioExiste.name
	},{
		$set:{lastStatus:Date.now()}
	})

	
})


app.listen(5000,()=>{
    console.log('Servidor rodando...')
});






 

