package com.dtstack.rdos.engine.service.db.dao;

import com.dtstack.rdos.engine.service.db.callback.MybatisSessionCallback;
import com.dtstack.rdos.engine.service.db.callback.MybatisSessionCallbackMethod;
import com.dtstack.rdos.engine.service.db.dataobject.RdosStreamTaskCheckpoint;
import com.dtstack.rdos.engine.service.db.mapper.RdosStreamTaskCheckpointMapper;
import org.apache.ibatis.session.SqlSession;

import java.sql.Timestamp;
import java.util.List;

/**
 * Reason:
 * Date: 2017/12/21
 * Company: www.dtstack.com
 * @author xuchao
 */

public class RdosStreamTaskCheckpointDAO {

    public void insert(String taskId, String engineTaskId, String checkpointInfo, Timestamp startTime, Timestamp endTime){

        MybatisSessionCallbackMethod.doCallback(new MybatisSessionCallback<Object>(){

            @Override
            public Object execute(SqlSession sqlSession) throws Exception {
                RdosStreamTaskCheckpointMapper taskCheckpointMapper = sqlSession.getMapper(RdosStreamTaskCheckpointMapper.class);
                taskCheckpointMapper.insert(taskId, engineTaskId, checkpointInfo, startTime, endTime);
                return null;
            }
        });
    }

    public List<RdosStreamTaskCheckpoint> listByTaskIdAndRangeTime(String taskId,Long triggerStart, Long triggerEnd){
        return MybatisSessionCallbackMethod.doCallback(new MybatisSessionCallback<List<RdosStreamTaskCheckpoint>>(){

            @Override
            public List<RdosStreamTaskCheckpoint> execute(SqlSession sqlSession) throws Exception {
                RdosStreamTaskCheckpointMapper taskCheckpointMapper = sqlSession.getMapper(RdosStreamTaskCheckpointMapper.class);
                return taskCheckpointMapper.listByTaskIdAndRangeTime(taskId,triggerStart,triggerEnd);
            }
        });
    }

    public RdosStreamTaskCheckpoint getByTaskIdAndEngineTaskId(String taskId, String engineTaskId){
        return MybatisSessionCallbackMethod.doCallback(new MybatisSessionCallback<RdosStreamTaskCheckpoint>(){

            @Override
            public RdosStreamTaskCheckpoint execute(SqlSession sqlSession) throws Exception {
                RdosStreamTaskCheckpointMapper taskCheckpointMapper = sqlSession.getMapper(RdosStreamTaskCheckpointMapper.class);
                return taskCheckpointMapper.getByTaskIdAndEngineTaskId(taskId, engineTaskId);
            }
        });
    }

    public Integer update(String taskId, String checkpoint){
        return MybatisSessionCallbackMethod.doCallback(new MybatisSessionCallback<Integer>() {
            @Override
            public Integer execute(SqlSession sqlSession) throws Exception {
                RdosStreamTaskCheckpointMapper taskCheckpointMapper = sqlSession.getMapper(RdosStreamTaskCheckpointMapper.class);
                return taskCheckpointMapper.updateCheckpoint(taskId, checkpoint);
            }
        });
    }

    public RdosStreamTaskCheckpoint getByTaskId(String taskId){
        return MybatisSessionCallbackMethod.doCallback(new MybatisSessionCallback<RdosStreamTaskCheckpoint>() {
            @Override
            public RdosStreamTaskCheckpoint execute(SqlSession sqlSession) throws Exception {
                RdosStreamTaskCheckpointMapper taskCheckpointMapper = sqlSession.getMapper(RdosStreamTaskCheckpointMapper.class);
                return taskCheckpointMapper.getByTaskId(taskId);
            }
        });
    }

    public Integer deleteByTaskId(String taskId){
        return MybatisSessionCallbackMethod.doCallback(new MybatisSessionCallback<Integer>() {
            @Override
            public Integer execute(SqlSession sqlSession) throws Exception {
                RdosStreamTaskCheckpointMapper taskCheckpointMapper = sqlSession.getMapper(RdosStreamTaskCheckpointMapper.class);
                return taskCheckpointMapper.deleteByTaskId(taskId);
            }
        });
    }
}
