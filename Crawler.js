const chrome = require("selenium-webdriver/chrome");

const {Builder, By, until,Capabilities} = require("selenium-webdriver");

const Tarefa = require("./Tarefa");

const mysql = require("mysql");

const shortid = require('shortid');

async function salvar_tarefas(tarefas){
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    const connection = await mysql.createConnection({
        host     : 'localhost',
        user     : 'cadu',
        password : 'ka323212',
        database : 'tarefas',
    });
    await connection.connect();
    const papeis = [];
    await connection.query("SHOW COLUMNS FROM Papéis;" , function (err, result){
        if (err) throw err ;
        result.forEach(function (papel) {
            papeis.push(papel.Field);
        });
    });
    const equilibrio = ["Mental","Espiritual","Emocional","Físico"];
    const triade = ["Importante","Circunstancial","Urgente"];
    await connection.query("SET FOREIGN_KEY_CHECKS = 0",function (err, result){
        if (err) console.log(err) ;
        console.log("sucesso na desabilitação da checagem de foreign key");
    });
    await tarefas.forEach(async function (tarefa) {
        //adicionando a meta
        let tarefa_atual = shortid.generate();
        let meta_atual = shortid.generate();
        let triade_atual = shortid.generate();
        let equilibrio_atual = shortid.generate();
        let papeis_atual = shortid.generate();
        const query = "INSERT INTO Metas (metas_oid,`"+ tarefa.projeto +"`) VALUES ('" + meta_atual+ "','1');";
        await connection.query(query , function (err, result){
           if (err) throw err ;
           console.log("Number of records inserted: "  + result.affectedRows)
        });
        //separando as tasks
        const tasks_triade= [];
        const tasks_equilibrio= [];
        const tasks_papeis= [];
        tarefa.tasks.split(',').forEach(function (task) {
            if(isInside(task,triade))
            {
                tasks_triade.push(task);
            }
            if(isInside(task,equilibrio)) {
                tasks_equilibrio.push(task)
            }
            if(isInside(task,papeis)){
                tasks_papeis.push(task);
            }
        });
        //salvando as tasks

        //triade
        if(tasks_triade.join().length >0) {
            tasks_triade.join();
            const query_triade = "INSERT INTO Tríade (triade_oid,`" + tasks_triade.join() + "`) VALUES ('" + triade_atual + "','1');";
            await connection.query(query_triade, function (err, result) {
                if (err) throw err;
                console.log("Number of records inserted: "  + result.affectedRows);
            });
        }
        //equilibrio
        if(tasks_equilibrio.join().length >0) {
            const quantidade_trues = repeatElement(1,tasks_equilibrio.length);
            const query_equilibrio = "INSERT INTO Equilíbrio (equilibrio_oid," + tasks_equilibrio.join(`,`) + ") VALUES ('" + equilibrio_atual + "',"+ quantidade_trues.join() + ");";
            await connection.query(query_equilibrio, function (err, result) {
                if (err) throw err;
                console.log("Number of records inserted: "  + result.affectedRows);
            });
        }
        //papeis
        if(tasks_papeis.length>0) {
            const query_papeis = "INSERT INTO Papéis (papeis_oid,`" + tasks_papeis.join() + "`) VALUES ('" + papeis_atual + "','1');";
            await connection.query(query_papeis, function (err, result) {
                if (err) throw err;
                console.log("Number of records inserted: "  + result.affectedRows);
            });
        }

        //adicionando a tarefa
        const campos = ["Nome", "Duração","Data_término","tarefa_oid","equilibrio_oid","metas_oid","papeis_oid","triade_oid"];
        const duracao = tarefa.nome.split('[')[1].substring(0,tarefa.nome.split('[').length + 1);
        const valores = [`'${tarefa.nome}'`,`'${duracao}'`,`'${tarefa.data}'`,`'${tarefa_atual}'`,`'${equilibrio_atual}'`,`'${meta_atual}'`,`'${papeis_atual}'`,`'${triade_atual}'`];
        const query_tarefa = "INSERT INTO Tarefa (" + campos.join() +  ") VALUES (" + valores.join() + ") ;";
        await connection.query(query_tarefa , function (err, result){
            if (err) throw err ;
            console.log("Number of records inserted: " + result.affectedRows);
        });
    });
    await sleep(10000);
    connection.end();
}


async function ler_tarefas() {
    const cookie_key = "YsJqCEibuDshOXm6xyLhvF/cMEc=?pCHK=Uyc5MjAyMGFlZGE0ODMwY2Q0OWFhMTM3ZTgwMTRkZGVmNCcKcDAKLg==&user_id=TDc2MDc1MDFMCi4=";
    let cookie_autenticacao = {
        name: "todoistd",
        value: cookie_key,
        path: '/',
        domain: 'todoist.com',
        secure: true,
        httpOnly: true
    };
    const options = {
        args: [
            '--allow-insecure-localhost',
            '--disable-gpu',
            '--disable-impl-side-painting',
            '--headless',
            '--no-sandbox'
        ],
    };
    const customChrome = Capabilities
        .chrome()
        .set('chromeOptions', options);
    const url_agenda = "https://todoist.com/";
    let lista_tarefas = [];
    let driver = await new Builder()
        .forBrowser('chrome')
        .withCapabilities(customChrome)
        .build();
    console.log("navegador iniciado com sucesso");
    try {
        await driver.get(url_agenda);
        await driver.manage().addCookie(cookie_autenticacao);
        console.log("adicionando cookies");
        await driver.get(url_agenda);
        console.log("redirecionando para o site");
        await driver.wait(until.elementLocated(By.id('agenda_view')), 10000);
        console.log("Página carregada com sucesso");
        await driver.findElements(By.className("not_shared menu_clickable"))
            .then(function (elements) {
                elements.forEach(function (element) {
                    element.getText()
                        .then(function (text) {
                            let propriedadesTarefa = text.split("\n");
                            let nome = propriedadesTarefa[0];
                            let  tasks = propriedadesTarefa[1];
                            let projeto = propriedadesTarefa[2];
                            let tarefa = new Tarefa(nome,tasks,projeto);
                            lista_tarefas.push(tarefa);
                        });
                })
            });
	console.log("tarefas adicionadas com sucesso!");
        await driver.wait(until.titleIs('Todoist'), 1000);
    } finally {
        await driver.quit();
	console.log("navegador fechado com sucesso");
    }
    console.log("tarefas adicionadas:" +  lista_tarefas.length);
    await salvar_tarefas(lista_tarefas);
    return lista_tarefas;
}
function isInside(element,array){
    let isEqual = false;
    array.forEach(function (x) {
        if(x === element) {
            isEqual =  true;
        }
    });
    return isEqual;
}
function repeatElement(element, numero){
    let array = [];
    for(let i =0;i< numero ;i++){
        array.push(element);
    }
    return array;
}

ler_tarefas();
