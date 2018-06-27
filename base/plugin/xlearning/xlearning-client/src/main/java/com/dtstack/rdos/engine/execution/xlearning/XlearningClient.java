package com.dtstack.rdos.engine.execution.xlearning;

import com.dtstack.rdos.commom.exception.ExceptionUtil;
import com.dtstack.rdos.commom.exception.RdosException;
import com.dtstack.rdos.engine.execution.base.AbsClient;
import com.dtstack.rdos.engine.execution.base.JobClient;
import com.dtstack.rdos.engine.execution.base.enums.RdosTaskStatus;
import com.dtstack.rdos.engine.execution.base.pojo.EngineResourceInfo;
import com.dtstack.rdos.engine.execution.base.pojo.JobResult;
import net.qihoo.xlearning.client.Client;
import net.qihoo.xlearning.conf.XLearningConfiguration;
import org.apache.commons.lang.StringUtils;
import org.apache.hadoop.hdfs.DistributedFileSystem;
import org.apache.hadoop.yarn.api.records.ApplicationId;
import org.apache.hadoop.yarn.api.records.ApplicationReport;
import org.apache.hadoop.yarn.api.records.FinalApplicationStatus;
import org.apache.hadoop.yarn.api.records.YarnApplicationState;
import org.apache.hadoop.yarn.client.api.YarnClient;
import org.apache.hadoop.yarn.exceptions.YarnException;
import org.apache.hadoop.yarn.util.ConverterUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import sun.misc.BASE64Decoder;

import java.io.IOException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.Properties;

/**
 * xlearning客户端
 * Date: 2018/6/22
 * Company: www.dtstack.com
 *
 * @author jingzhen
 */
public class XlearningClient extends AbsClient {

    private static final Logger LOG = LoggerFactory.getLogger(XlearningClient.class);

    private Client client;

    private EngineResourceInfo resourceInfo;

    final BASE64Decoder decoder = new BASE64Decoder();

    @Override
    public void init(Properties prop) throws Exception {
        resourceInfo = new EngineResourceInfo();
        XLearningConfiguration conf = new XLearningConfiguration();
        conf.set("fs.hdfs.impl", DistributedFileSystem.class.getName());
        String hadoopConfDir = prop.getProperty("hadoop.conf.dir");
        if(StringUtils.isNotBlank(hadoopConfDir)) {
            conf.addResource(new URL("file://" + hadoopConfDir + "/" + "core-site.xml"));
            conf.addResource(new URL("file://" + hadoopConfDir + "/" + "hdfs-site.xml"));
            conf.addResource(new URL("file://" + hadoopConfDir + "/" + "yarn-site.xml"));
        }

        Enumeration enumeration =  prop.propertyNames();
        while(enumeration.hasMoreElements()) {
            String key = (String) enumeration.nextElement();
            conf.set(key, (String) prop.get(key));
        }
        client = new Client(conf);
    }

    @Override
    public JobResult cancelJob(String jobId) {
        try {
            client.kill(jobId);
            return JobResult.createSuccessResult(jobId);
        } catch (Exception e) {
            LOG.error("", e);
            return JobResult.createErrorResult(e.getMessage());
        }
    }

    @Override
    public RdosTaskStatus getJobStatus(String jobId) throws IOException {
        if(org.apache.commons.lang3.StringUtils.isEmpty(jobId)){
            return null;
        }
        try {
            ApplicationReport report = client.getApplicationReport(jobId);
            YarnApplicationState applicationState = report.getYarnApplicationState();
            switch(applicationState) {
                case KILLED:
                    return RdosTaskStatus.KILLED;
                case NEW:
                case NEW_SAVING:
                    return RdosTaskStatus.CREATED;
                case SUBMITTED:
                    //FIXME 特殊逻辑,认为已提交到计算引擎的状态为等待资源状态
                    return RdosTaskStatus.WAITCOMPUTE;
                case ACCEPTED:
                    return RdosTaskStatus.SCHEDULED;
                case RUNNING:
                    return RdosTaskStatus.RUNNING;
                case FINISHED:
                    //state 为finished状态下需要兼顾判断finalStatus.
                    FinalApplicationStatus finalApplicationStatus = report.getFinalApplicationStatus();
                    if(finalApplicationStatus == FinalApplicationStatus.FAILED){
                        return RdosTaskStatus.FAILED;
                    }else if(finalApplicationStatus == FinalApplicationStatus.SUCCEEDED){
                        return RdosTaskStatus.FINISHED;
                    }else if(finalApplicationStatus == FinalApplicationStatus.KILLED){
                        return RdosTaskStatus.KILLED;
                    }else{
                        return RdosTaskStatus.RUNNING;
                    }

                case FAILED:
                    return RdosTaskStatus.FAILED;
                default:
                    throw new RdosException("Unsupported application state");
            }
        } catch (YarnException e) {
            LOG.error("", e);
            return RdosTaskStatus.NOTFOUND;
        }
    }

    @Override
    public String getJobMaster() {
        throw new RdosException("xlearning client not support method 'getJobMaster'");
    }

    @Override
    public String getMessageByHttp(String path) {
        return null;
    }


    @Override
    public JobResult submitPythonJob(JobClient jobClient){
        try {
            String exeArgs = jobClient.getClassArgs();
            String[] args = exeArgs.split("\\s+");
            for(int i = 0; i < args.length - 1; ++i) {
                if(args[i].equals("--launch-cmd")) {
                    args[i+1] = new String(decoder.decodeBuffer(args[i+1]), "UTF-8");
                }
            }
            String jobId = client.submit(args);
            return JobResult.createSuccessResult(jobId);
        } catch(Exception ex) {
            LOG.info("", ex);
            return JobResult.createErrorResult("submit job get unknown error\n" + ExceptionUtil.getErrorMessage(ex));
        }
    }

    @Override
    public EngineResourceInfo getAvailSlots() {
        return resourceInfo;
    }

    @Override
    public String getJobLog(String jobId) {

        try {
            ApplicationReport applicationReport = client.getApplicationReport(jobId);
            String msgInfo = applicationReport.getDiagnostics();
            return msgInfo;
        } catch (Exception e) {
            LOG.error("", e);
            return e.getMessage();
        }
    }

}
